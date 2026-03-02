-- ============================================================
-- SYSTÈME DE GÉNÉRATION ET GESTION DE LEADS BTP
-- ============================================================

-- Table principale des leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone_mobile TEXT,
  phone_fixed TEXT,
  website TEXT,
  maps_url TEXT,
  rating NUMERIC(3,1),
  reviews_count INTEGER DEFAULT 0,
  size_bucket TEXT CHECK (size_bucket IN ('0-3', '4-10', '10-50', '50+')),
  priority CHAR(1) CHECK (priority IN ('A', 'B', 'C')),
  dept_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'SIGNED')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads avec uniquement un fixe (à enrichir manuellement ou via crawler)
CREATE TABLE IF NOT EXISTS public.leads_fixed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_fixed TEXT,
  website TEXT,
  dept_code TEXT,
  enriched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suivi des jobs de génération
CREATE TABLE IF NOT EXISTS public.lead_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code TEXT NOT NULL,
  dept_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED')),
  total_found INTEGER DEFAULT 0,
  total_inserted INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  total_cells INTEGER DEFAULT 0,
  processed_cells INTEGER DEFAULT 0,
  progress_cursor JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_leads_dept_code   ON public.leads(dept_code);
CREATE INDEX IF NOT EXISTS idx_leads_status       ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id     ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_priority     ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at   ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_jobs_status   ON public.lead_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lead_jobs_dept     ON public.lead_jobs(dept_code);
CREATE INDEX IF NOT EXISTS idx_leads_fixed_dept   ON public.leads_fixed(dept_code);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_leads_updated_at();

-- RLS
ALTER TABLE public.leads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_fixed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_jobs   ENABLE ROW LEVEL SECURITY;

-- Admins : accès total
CREATE POLICY "Admins full access leads" ON public.leads FOR ALL
  USING (
    EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
      AND u.email IN (SELECT email FROM public.closer_emails)
    )
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Admins full access lead_jobs" ON public.lead_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'is_system_admin' = 'true'
    )
  );

CREATE POLICY "Admins full access leads_fixed" ON public.leads_fixed FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Closers : voient et modifient uniquement leurs leads assignés
CREATE POLICY "Closers see own leads" ON public.leads FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'is_system_admin' = 'true'
    )
  );

CREATE POLICY "Closers update own leads" ON public.leads FOR UPDATE
  USING (owner_id = auth.uid());

-- Service role bypass pour le worker
CREATE POLICY "Service role all leads" ON public.leads FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role all jobs" ON public.lead_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Fonction: stats leads par closer
CREATE OR REPLACE FUNCTION public.get_closer_lead_stats()
RETURNS TABLE (
  closer_id UUID,
  closer_email TEXT,
  closer_name TEXT,
  total_assigned BIGINT,
  contacted BIGINT,
  qualified BIGINT,
  signed BIGINT
)
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    u.id AS closer_id,
    u.email AS closer_email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS closer_name,
    COUNT(l.id) AS total_assigned,
    COUNT(l.id) FILTER (WHERE l.status = 'CONTACTED') AS contacted,
    COUNT(l.id) FILTER (WHERE l.status = 'QUALIFIED') AS qualified,
    COUNT(l.id) FILTER (WHERE l.status = 'SIGNED') AS signed
  FROM public.closer_emails ce
  JOIN auth.users u ON LOWER(u.email) = LOWER(ce.email)
  LEFT JOIN public.leads l ON l.owner_id = u.id
  GROUP BY u.id, u.email, u.raw_user_meta_data
$$;
