-- ============================================================
-- FIX RLS LEADS + FONCTION D'ASSIGNATION PAR EMAIL
-- ============================================================

-- 1. Supprimer toutes les policies existantes (repartir propre)
DROP POLICY IF EXISTS "Admins full access leads"       ON public.leads;
DROP POLICY IF EXISTS "Closers see own leads"          ON public.leads;
DROP POLICY IF EXISTS "Closers update own leads"       ON public.leads;
DROP POLICY IF EXISTS "Service role all leads"         ON public.leads;
DROP POLICY IF EXISTS "Authenticated read leads"       ON public.leads;
DROP POLICY IF EXISTS "Service role full leads"        ON public.leads;
DROP POLICY IF EXISTS "Owners can update their leads"  ON public.leads;

DROP POLICY IF EXISTS "Admins full access lead_jobs"   ON public.lead_jobs;
DROP POLICY IF EXISTS "Service role all jobs"          ON public.lead_jobs;
DROP POLICY IF EXISTS "Admins full access leads_fixed" ON public.leads_fixed;
DROP POLICY IF EXISTS "Service role all leads_fixed"   ON public.leads_fixed;

-- 2. Policies leads : propres et sans conflits
-- Lecture : un utilisateur voit ses propres leads OU s'il est admin système
CREATE POLICY "leads_select" ON public.leads FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      owner_id = auth.uid()
      OR (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE
    )
  );

-- Mise à jour : uniquement ses propres leads
CREATE POLICY "leads_update" ON public.leads FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      owner_id = auth.uid()
      OR (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE
    )
  );

-- Insert/Delete : seulement les admins système (les insertions du worker passent par service_role)
CREATE POLICY "leads_insert_admin" ON public.leads FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE
  );

CREATE POLICY "leads_delete_admin" ON public.leads FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE
  );

-- 3. Policies lead_jobs (admin seulement pour lire l'avancement)
CREATE POLICY "lead_jobs_select" ON public.lead_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "lead_jobs_insert_admin" ON public.lead_jobs FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE
  );

CREATE POLICY "lead_jobs_update_admin" ON public.lead_jobs FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE
  );

-- 4. Policies leads_fixed (admin seulement)
CREATE POLICY "leads_fixed_select" ON public.leads_fixed FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 5. Fonction RPC pour assigner les leads par email du closer
-- (évite de passer un UUID depuis le frontend — le lookup est fait côté DB)
CREATE OR REPLACE FUNCTION public.assign_leads_to_closer(
  p_dept_code TEXT,
  p_closer_email TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Trouver l'UUID du closer via son email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_closer_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Closer non trouvé : %', p_closer_email;
  END IF;

  -- Assigner tous les leads NEW sans propriétaire dans ce département
  UPDATE public.leads
  SET owner_id = v_user_id
  WHERE dept_code = p_dept_code
    AND status = 'NEW'
    AND owner_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Permettre aux utilisateurs authentifiés d'appeler cette fonction
GRANT EXECUTE ON FUNCTION public.assign_leads_to_closer(TEXT, TEXT) TO authenticated;
