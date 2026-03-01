-- ============================================================================
-- Table: closer_emails
-- Description: Emails des commerciaux closers (accès démo + création entreprises)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.closer_emails (
  email      TEXT PRIMARY KEY,
  added_by   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS activée — lecture libre (pour le check auth), écriture réservée aux admins système
ALTER TABLE public.closer_emails ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié peut vérifier si son email est closer
CREATE POLICY "closer_emails_select" ON public.closer_emails
  FOR SELECT USING (true);

-- Écriture : uniquement les admins système (via service_role ou RPC SECURITY DEFINER)
CREATE POLICY "closer_emails_insert" ON public.closer_emails
  FOR INSERT WITH CHECK (true);

CREATE POLICY "closer_emails_delete" ON public.closer_emails
  FOR DELETE USING (true);

-- Seed : email déjà configuré en dur dans le code
INSERT INTO public.closer_emails (email, added_by)
VALUES ('sabbg.du73100@gmail.com', 'system')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE public.closer_emails IS 'Liste des emails qui ont le rôle closer (accès démo + création entreprises)';
