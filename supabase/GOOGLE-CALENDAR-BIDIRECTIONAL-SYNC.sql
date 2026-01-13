-- ============================================================================
-- 🔄 SYNCHRONISATION BIDIRECTIONNELLE GOOGLE CALENDAR
-- ============================================================================
-- Description: Architecture complète pour synchronisation automatique
--              App ↔ Google Calendar (bidirectionnelle)
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Ajouter colonnes nécessaires à events
-- ============================================================================

DO $$
BEGIN
  -- Ajouter updated_source pour éviter les boucles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'updated_source'
  ) THEN
    ALTER TABLE public.events ADD COLUMN updated_source TEXT DEFAULT 'app' 
      CHECK (updated_source IN ('app', 'google'));
    RAISE NOTICE '✅ Colonne updated_source ajoutée à events';
  END IF;

  -- Ajouter last_synced_at pour tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne last_synced_at ajoutée à events';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: Ajouter sync_token à google_calendar_connections
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'sync_token'
  ) THEN
    ALTER TABLE public.google_calendar_connections ADD COLUMN sync_token TEXT;
    RAISE NOTICE '✅ Colonne sync_token ajoutée à google_calendar_connections';
  END IF;
END $$;

-- Index pour sync_token
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_sync_token 
ON public.google_calendar_connections(sync_token) 
WHERE sync_token IS NOT NULL;

-- ============================================================================
-- ÉTAPE 3: Créer table pour queue de synchronisation (évite les appels directs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.google_calendar_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Éviter les doublons
  UNIQUE(event_id, action, status) 
    WHERE status IN ('pending', 'processing')
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_queue_company_status 
ON public.google_calendar_sync_queue(company_id, status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_queue_created_at 
ON public.google_calendar_sync_queue(created_at);

-- Enable RLS
ALTER TABLE public.google_calendar_sync_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs de la company peuvent voir leur queue
CREATE POLICY "Company users can view sync queue"
ON public.google_calendar_sync_queue FOR SELECT
USING (
  company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
);

-- ============================================================================
-- ÉTAPE 4: Fonction pour ajouter à la queue (appelée par trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_google_calendar_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_connection_exists BOOLEAN;
  v_sync_direction TEXT;
BEGIN
  -- Récupérer company_id
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  
  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Vérifier qu'une connexion Google Calendar existe et est active
  SELECT EXISTS (
    SELECT 1 
    FROM public.google_calendar_connections gcc
    WHERE gcc.company_id = v_company_id
    AND gcc.enabled = true
    AND gcc.expires_at > now()
  ) INTO v_connection_exists;

  IF NOT v_connection_exists THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Récupérer sync_direction
  SELECT sync_direction INTO v_sync_direction
  FROM public.google_calendar_connections
  WHERE company_id = v_company_id
  AND enabled = true
  LIMIT 1;

  -- Ne synchroniser que si direction = 'app_to_google' ou 'bidirectional'
  IF v_sync_direction NOT IN ('app_to_google', 'bidirectional') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ⚠️ ANTI-LOOP: Ne pas synchroniser si last_update_source = 'google'
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.last_update_source, 'app') = 'google' THEN
      RETURN NEW;
    END IF;
    -- Ne pas synchroniser si updated_at <= last_synced_at (déjà synchronisé)
    IF OLD.last_synced_at IS NOT NULL AND NEW.updated_at <= OLD.last_synced_at THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Déterminer l'action
  IF TG_OP = 'INSERT' THEN
    -- Ne synchroniser que si last_update_source = 'app' (par défaut)
    IF COALESCE(NEW.last_update_source, 'app') = 'app' THEN
      INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
      VALUES (v_company_id, NEW.id, 'create')
      ON CONFLICT (event_id, action, status) 
      WHERE status IN ('pending', 'processing')
      DO NOTHING;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ne synchroniser que si last_update_source = 'app'
    IF COALESCE(NEW.last_update_source, 'app') = 'app' THEN
      -- Vérifier si l'événement a déjà un google_event_id
      IF NEW.google_event_id IS NOT NULL THEN
        INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
        VALUES (v_company_id, NEW.id, 'update')
        ON CONFLICT (event_id, action, status) 
        WHERE status IN ('pending', 'processing')
        DO NOTHING;
      ELSE
        -- Pas encore synchronisé, créer
        INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
        VALUES (v_company_id, NEW.id, 'create')
        ON CONFLICT (event_id, action, status) 
        WHERE status IN ('pending', 'processing')
        DO NOTHING;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Supprimer seulement si google_event_id existe
    IF OLD.google_event_id IS NOT NULL THEN
      INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
      VALUES (v_company_id, OLD.id, 'delete')
      ON CONFLICT (event_id, action, status) 
      WHERE status IN ('pending', 'processing')
      DO NOTHING;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÉTAPE 5: Créer les triggers sur events
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_queue_google_calendar_sync_insert ON public.events;
CREATE TRIGGER trigger_queue_google_calendar_sync_insert
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_google_calendar_sync();

DROP TRIGGER IF EXISTS trigger_queue_google_calendar_sync_update ON public.events;
CREATE TRIGGER trigger_queue_google_calendar_sync_update
  AFTER UPDATE ON public.events
  FOR EACH ROW
  WHEN (
    -- Ne déclencher que si les champs pertinents ont changé
    OLD.title IS DISTINCT FROM NEW.title
    OR OLD.description IS DISTINCT FROM NEW.description
    OR OLD.start_date IS DISTINCT FROM NEW.start_date
    OR OLD.end_date IS DISTINCT FROM NEW.end_date
    OR OLD.all_day IS DISTINCT FROM NEW.all_day
    OR OLD.location IS DISTINCT FROM NEW.location
    OR OLD.type IS DISTINCT FROM NEW.type
    OR OLD.color IS DISTINCT FROM NEW.color
  )
  EXECUTE FUNCTION public.queue_google_calendar_sync();

DROP TRIGGER IF EXISTS trigger_queue_google_calendar_sync_delete ON public.events;
CREATE TRIGGER trigger_queue_google_calendar_sync_delete
  AFTER DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_google_calendar_sync();

-- ============================================================================
-- ÉTAPE 6: Fonction pour nettoyer la queue (appelée périodiquement)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_google_calendar_sync_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les entrées complétées de plus de 24h
  DELETE FROM public.google_calendar_sync_queue
  WHERE status = 'completed'
  AND processed_at < now() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Réinitialiser les entrées en processing depuis plus de 10 minutes (timeout)
  UPDATE public.google_calendar_sync_queue
  SET status = 'pending', retry_count = retry_count + 1
  WHERE status = 'processing'
  AND created_at < now() - INTERVAL '10 minutes'
  AND retry_count < max_retries;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- ÉTAPE 7: Fonction helper pour obtenir un token valide
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_valid_google_calendar_token(connection_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_connection RECORD;
  v_new_token TEXT;
  v_new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Récupérer la connexion
  SELECT * INTO v_connection
  FROM public.google_calendar_connections
  WHERE id = connection_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found: %', connection_uuid;
  END IF;

  -- Vérifier si le token est encore valide (avec marge de 5 minutes)
  IF v_connection.expires_at > (now() + INTERVAL '5 minutes') THEN
    RETURN v_connection.access_token;
  END IF;

  -- Token expiré, rafraîchir
  -- Note: Cette fonction sera appelée depuis l'Edge Function qui a accès aux secrets
  -- Ici on retourne juste l'info qu'il faut rafraîchir
  RAISE EXCEPTION 'Token expired, refresh needed';
END;
$$;

-- ============================================================================
-- ÉTAPE 8: Commentaires
-- ============================================================================

COMMENT ON COLUMN public.events.last_update_source IS 'Source de la dernière modification: app ou google (pour éviter les boucles)';
COMMENT ON COLUMN public.events.last_synced_at IS 'Timestamp de la dernière synchronisation avec Google Calendar';
COMMENT ON COLUMN public.google_calendar_connections.sync_token IS 'Token de synchronisation incrémentale Google Calendar (pour éviter de re-télécharger tout)';
COMMENT ON TABLE public.google_calendar_sync_queue IS 'Queue de synchronisation pour éviter les appels directs depuis les triggers';

-- ============================================================================
-- RAPPORT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SYNCHRONISATION BIDIRECTIONNELLE CONFIGURÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Colonnes ajoutées (updated_source, last_synced_at, sync_token)';
  RAISE NOTICE '✅ Table google_calendar_sync_queue créée';
  RAISE NOTICE '✅ Triggers créés sur events (INSERT/UPDATE/DELETE)';
  RAISE NOTICE '✅ Fonction queue_google_calendar_sync créée';
  RAISE NOTICE '✅ Anti-loop: updated_source = google ignoré';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Prochaines étapes:';
  RAISE NOTICE '   1. Déployer Edge Function google-calendar-sync-processor';
  RAISE NOTICE '   2. Déployer Edge Function google-calendar-webhook';
  RAISE NOTICE '   3. Configurer webhooks Google Calendar';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
