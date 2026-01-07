-- ============================================================================
-- 🔔 PRÉPARATION ARCHITECTURE WEBHOOKS GOOGLE CALENDAR
-- ============================================================================
-- Description: Prépare l'architecture pour la synchronisation inverse
-- (Google Calendar → App) via webhooks Google Calendar Watch API
-- ============================================================================

-- Table pour stocker les webhooks Google Calendar actifs
CREATE TABLE IF NOT EXISTS public.google_calendar_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration_timestamp BIGINT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT google_calendar_webhooks_company_calendar_unique 
    UNIQUE(company_id, calendar_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_google_calendar_webhooks_company_id 
ON public.google_calendar_webhooks(company_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_webhooks_channel_id 
ON public.google_calendar_webhooks(channel_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_webhooks_expiration 
ON public.google_calendar_webhooks(expiration_timestamp) 
WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.google_calendar_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Seul le propriétaire peut voir les webhooks de son entreprise
CREATE POLICY "Owners can view company google calendar webhooks"
ON public.google_calendar_webhooks FOR SELECT
USING (
  google_calendar_webhooks.company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = google_calendar_webhooks.company_id
    AND r.slug = 'owner'
  )
);

-- Policy: Seul le propriétaire peut créer des webhooks
CREATE POLICY "Owners can create company google calendar webhooks"
ON public.google_calendar_webhooks FOR INSERT
WITH CHECK (
  google_calendar_webhooks.company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = google_calendar_webhooks.company_id
    AND r.slug = 'owner'
  )
);

-- Policy: Seul le propriétaire peut supprimer des webhooks
CREATE POLICY "Owners can delete company google calendar webhooks"
ON public.google_calendar_webhooks FOR DELETE
USING (
  google_calendar_webhooks.company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = google_calendar_webhooks.company_id
    AND r.slug = 'owner'
  )
);

-- Fonction pour nettoyer les webhooks expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_google_webhooks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.google_calendar_webhooks
  WHERE expiration_timestamp < EXTRACT(EPOCH FROM now())::BIGINT * 1000
  AND enabled = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_google_webhooks IS 'Nettoie les webhooks Google Calendar expirés';

-- Commentaires
COMMENT ON TABLE public.google_calendar_webhooks IS 'Stocke les webhooks Google Calendar Watch API pour la synchronisation inverse';
COMMENT ON COLUMN public.google_calendar_webhooks.channel_id IS 'ID unique du canal de notification Google';
COMMENT ON COLUMN public.google_calendar_webhooks.resource_id IS 'ID de la ressource Google Calendar surveillée';
COMMENT ON COLUMN public.google_calendar_webhooks.expiration_timestamp IS 'Timestamp d''expiration du webhook (millisecondes)';

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ARCHITECTURE WEBHOOKS GOOGLE CALENDAR PRÉPARÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table google_calendar_webhooks créée';
  RAISE NOTICE '✅ RLS policies configurées (propriétaire uniquement)';
  RAISE NOTICE '✅ Fonction cleanup_expired_google_webhooks créée';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Prêt pour implémentation future de la sync inverse';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;


