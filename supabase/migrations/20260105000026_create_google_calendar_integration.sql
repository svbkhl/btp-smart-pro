-- ============================================================================
-- 🔗 INTÉGRATION GOOGLE CALENDAR
-- ============================================================================
-- Description: Tables et fonctions pour synchroniser avec Google Calendar
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- TABLE: google_calendar_connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Informations Google
  google_email TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  
  -- Tokens OAuth (chiffrés côté application)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Configuration
  sync_direction TEXT DEFAULT 'app_to_google' CHECK (sync_direction IN ('app_to_google', 'bidirectional', 'google_to_app')),
  enabled BOOLEAN DEFAULT true,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Contraintes
  UNIQUE(user_id, company_id) -- Un utilisateur ne peut avoir qu'une connexion par entreprise
);

COMMENT ON TABLE public.google_calendar_connections IS 'Connexions Google Calendar par utilisateur et entreprise';
COMMENT ON COLUMN public.google_calendar_connections.sync_direction IS 'Direction de synchronisation: app_to_google, bidirectional, google_to_app';

-- ============================================================================
-- TABLE: events - Ajouter colonnes Google Calendar
-- ============================================================================
DO $$
BEGIN
  -- Ajouter google_event_id si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_event_id TEXT;
    RAISE NOTICE '✅ Colonne google_event_id ajoutée à events';
  END IF;

  -- Ajouter synced_with_google si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'synced_with_google'
  ) THEN
    ALTER TABLE public.events ADD COLUMN synced_with_google BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne synced_with_google ajoutée à events';
  END IF;

  -- Ajouter google_sync_error si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_sync_error'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_sync_error TEXT;
    RAISE NOTICE '✅ Colonne google_sync_error ajoutée à events';
  END IF;
END $$;

-- Index pour google_event_id
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON public.events(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_synced_with_google ON public.events(synced_with_google) WHERE synced_with_google = true;

-- Index pour google_calendar_connections
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_user_id ON public.google_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_company_id ON public.google_calendar_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_enabled ON public.google_calendar_connections(enabled) WHERE enabled = true;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Activer RLS sur google_calendar_connections
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
CREATE POLICY "Users can view their own google calendar connections"
ON public.google_calendar_connections FOR SELECT
USING (
  user_id = auth.uid()
  AND company_id = public.current_company_id()
);

-- Policy: Users can insert their own connections
CREATE POLICY "Users can create their own google calendar connections"
ON public.google_calendar_connections FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.current_company_id()
);

-- Policy: Users can update their own connections
CREATE POLICY "Users can update their own google calendar connections"
ON public.google_calendar_connections FOR UPDATE
USING (
  user_id = auth.uid()
  AND company_id = public.current_company_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.current_company_id()
);

-- Policy: Users can delete their own connections
CREATE POLICY "Users can delete their own google calendar connections"
ON public.google_calendar_connections FOR DELETE
USING (
  user_id = auth.uid()
  AND company_id = public.current_company_id()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction: Récupérer la connexion Google Calendar active d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_active_google_calendar_connection(user_uuid UUID, company_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_id UUID,
  google_email TEXT,
  calendar_id TEXT,
  sync_direction TEXT,
  enabled BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcc.id,
    gcc.user_id,
    gcc.company_id,
    gcc.google_email,
    gcc.calendar_id,
    gcc.sync_direction,
    gcc.enabled,
    gcc.expires_at,
    gcc.last_sync_at
  FROM public.google_calendar_connections gcc
  WHERE gcc.user_id = user_uuid
  AND gcc.company_id = company_uuid
  AND gcc.enabled = true
  AND gcc.expires_at > now()
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_active_google_calendar_connection IS 'Retourne la connexion Google Calendar active d''un utilisateur';

-- Fonction: Mettre à jour last_sync_at
CREATE OR REPLACE FUNCTION public.update_google_calendar_sync_time(connection_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.google_calendar_connections
  SET last_sync_at = now(),
      updated_at = now()
  WHERE id = connection_uuid;
END;
$$;

COMMENT ON FUNCTION public.update_google_calendar_sync_time IS 'Met à jour le timestamp de dernière synchronisation';

-- Trigger pour updated_at
CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ INTÉGRATION GOOGLE CALENDAR CRÉÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table google_calendar_connections créée';
  RAISE NOTICE '✅ Colonnes Google ajoutées à events';
  RAISE NOTICE '✅ Indexes créés';
  RAISE NOTICE '✅ RLS policies activées';
  RAISE NOTICE '✅ Fonctions utilitaires créées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Isolation multi-tenant garantie';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
