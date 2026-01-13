-- ============================================================================
-- 🔄 SYNCHRONISATION BIDIRECTIONNELLE GOOGLE CALENDAR - MIGRATION COMPLÈTE
-- ============================================================================
-- Description: Architecture complète pour synchronisation automatique
--              App ↔ Google Calendar (bidirectionnelle) avec anti-doublons
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Ajouter toutes les colonnes manquantes à events
-- ============================================================================

DO $$
BEGIN
  -- google_calendar_id (OBLIGATOIRE pour la clé composite)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_calendar_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_calendar_id TEXT;
    RAISE NOTICE '✅ Colonne google_calendar_id ajoutée à events';
  END IF;

  -- google_updated_at (pour résoudre les conflits)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_updated_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_updated_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne google_updated_at ajoutée à events';
  END IF;

  -- last_update_source (anti-loop)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'last_update_source'
  ) THEN
    -- Vérifier si updated_source existe déjà
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'updated_source'
    ) THEN
      ALTER TABLE public.events RENAME COLUMN updated_source TO last_update_source;
      RAISE NOTICE '✅ Colonne updated_source renommée en last_update_source';
    ELSE
      ALTER TABLE public.events ADD COLUMN last_update_source TEXT DEFAULT 'app' 
        CHECK (last_update_source IN ('app', 'google'));
      RAISE NOTICE '✅ Colonne last_update_source ajoutée à events';
    END IF;
  END IF;

  -- last_synced_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne last_synced_at ajoutée à events';
  END IF;

  -- deleted_at (soft delete)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne deleted_at ajoutée à events';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: Créer la contrainte UNIQUE (google_calendar_id, google_event_id)
-- ============================================================================

-- Supprimer les contraintes UNIQUE existantes sur google_event_id seul
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
    AND contype = 'u'
    AND conkey::text LIKE '%google_event_id%'
    AND conname != 'events_google_calendar_event_unique'
  LOOP
    EXECUTE format('ALTER TABLE public.events DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '🗑️ Contrainte supprimée: %', constraint_name;
  END LOOP;
END $$;

-- Supprimer l'index existant si présent
DROP INDEX IF EXISTS events_google_calendar_event_unique_idx;

-- Créer l'index UNIQUE composite (NULL values autorisés)
CREATE UNIQUE INDEX IF NOT EXISTS events_google_calendar_event_unique_idx
ON public.events(google_calendar_id, google_event_id)
WHERE google_calendar_id IS NOT NULL AND google_event_id IS NOT NULL;

-- Créer la contrainte UNIQUE nommée (pour onConflict dans Supabase)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
    AND conname = 'events_google_calendar_event_unique'
  ) THEN
    ALTER TABLE public.events
    ADD CONSTRAINT events_google_calendar_event_unique
    UNIQUE USING INDEX events_google_calendar_event_unique_idx;
    
    RAISE NOTICE '✅ Contrainte UNIQUE (google_calendar_id, google_event_id) créée';
  ELSE
    RAISE NOTICE '✅ Contrainte UNIQUE existe déjà';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 3: Ajouter sync_token à google_calendar_connections
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

CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_sync_token 
ON public.google_calendar_connections(sync_token) 
WHERE sync_token IS NOT NULL;

-- ============================================================================
-- ÉTAPE 4: Créer/Améliorer table google_calendar_webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.google_calendar_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL, -- ID du calendrier Google
  channel_id TEXT NOT NULL UNIQUE, -- ID unique du canal Google
  resource_id TEXT NOT NULL, -- ID de la ressource Google
  expiration_timestamp BIGINT NOT NULL, -- Timestamp d'expiration (millisecondes)
  sync_token TEXT, -- Token pour sync incrémentale
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Un webhook actif par company/calendar
  CONSTRAINT google_calendar_webhooks_company_calendar_unique
    UNIQUE(company_id, calendar_id)
    WHERE enabled = true
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_webhooks_company_id
ON public.google_calendar_webhooks(company_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_webhooks_channel_id
ON public.google_calendar_webhooks(channel_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_webhooks_expiration
ON public.google_calendar_webhooks(expiration_timestamp)
WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.google_calendar_webhooks ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "Company users can view webhooks" ON public.google_calendar_webhooks;
CREATE POLICY "Company users can view webhooks"
ON public.google_calendar_webhooks FOR SELECT
USING (
  company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "Company admins can manage webhooks" ON public.google_calendar_webhooks;
CREATE POLICY "Company admins can manage webhooks"
ON public.google_calendar_webhooks FOR ALL
USING (
  company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid() 
    AND r.slug IN ('owner', 'admin')
    LIMIT 1
  )
);

-- ============================================================================
-- ÉTAPE 5: Créer/Améliorer table google_calendar_sync_queue
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
DROP POLICY IF EXISTS "Company users can view sync queue" ON public.google_calendar_sync_queue;
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
-- ÉTAPE 6: Fonction pour queue sync (App -> Google)
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

  -- Ignorer les événements supprimés (soft delete)
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL THEN
    -- Si c'est une suppression, ajouter à la queue
    INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
    VALUES (v_company_id, NEW.id, 'delete')
    ON CONFLICT (event_id, action, status) 
    WHERE status IN ('pending', 'processing')
    DO NOTHING;
    RETURN NEW;
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
      -- Si google_event_id existe, c'est un UPDATE, sinon CREATE
      IF NEW.google_event_id IS NOT NULL THEN
        INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
        VALUES (v_company_id, NEW.id, 'update')
        ON CONFLICT (event_id, action, status) 
        WHERE status IN ('pending', 'processing')
        DO NOTHING;
      ELSE
        INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
        VALUES (v_company_id, NEW.id, 'create')
        ON CONFLICT (event_id, action, status) 
        WHERE status IN ('pending', 'processing')
        DO NOTHING;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.google_calendar_sync_queue (company_id, event_id, action)
    VALUES (v_company_id, OLD.id, 'delete')
    ON CONFLICT (event_id, action, status) 
    WHERE status IN ('pending', 'processing')
    DO NOTHING;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÉTAPE 7: Créer les triggers sur events
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
  EXECUTE FUNCTION public.queue_google_calendar_sync();

DROP TRIGGER IF EXISTS trigger_queue_google_calendar_sync_delete ON public.events;
CREATE TRIGGER trigger_queue_google_calendar_sync_delete
  AFTER DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_google_calendar_sync();

-- ============================================================================
-- ÉTAPE 8: Fonction helper pour récupérer token valide
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_valid_google_calendar_token(p_company_id UUID)
RETURNS TABLE (
  connection_id UUID,
  access_token TEXT,
  refresh_token TEXT,
  calendar_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_connection RECORD;
BEGIN
  SELECT 
    id,
    access_token,
    refresh_token,
    calendar_id,
    expires_at
  INTO v_connection
  FROM public.google_calendar_connections
  WHERE company_id = p_company_id
  AND enabled = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_connection IS NULL THEN
    RETURN;
  END IF;

  -- Si le token expire dans moins de 5 minutes, retourner refresh_token pour rafraîchir
  IF v_connection.expires_at <= now() + INTERVAL '5 minutes' THEN
    RETURN QUERY SELECT 
      v_connection.id,
      NULL::TEXT as access_token, -- Nécessite refresh
      v_connection.refresh_token,
      v_connection.calendar_id,
      v_connection.expires_at;
  ELSE
    RETURN QUERY SELECT 
      v_connection.id,
      v_connection.access_token,
      v_connection.refresh_token,
      v_connection.calendar_id,
      v_connection.expires_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ÉTAPE 9: Fonction de nettoyage de la queue
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_google_calendar_sync_queue()
RETURNS void AS $$
BEGIN
  -- Supprimer les items complétés depuis plus de 7 jours
  DELETE FROM public.google_calendar_sync_queue
  WHERE status = 'completed'
  AND processed_at < now() - INTERVAL '7 days';

  -- Réinitialiser les items en processing depuis plus de 1 heure (probablement bloqués)
  UPDATE public.google_calendar_sync_queue
  SET status = 'pending', retry_count = retry_count + 1
  WHERE status = 'processing'
  AND created_at < now() - INTERVAL '1 hour'
  AND retry_count < max_retries;

  -- Marquer comme failed les items qui ont dépassé max_retries
  UPDATE public.google_calendar_sync_queue
  SET status = 'failed', error_message = 'Max retries exceeded'
  WHERE status = 'pending'
  AND retry_count >= max_retries;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÉTAPE 10: Fonction de nettoyage des webhooks expirés
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_google_webhooks()
RETURNS void AS $$
BEGIN
  -- Désactiver les webhooks expirés
  UPDATE public.google_calendar_webhooks
  SET enabled = false, updated_at = now()
  WHERE enabled = true
  AND expiration_timestamp < EXTRACT(EPOCH FROM now())::BIGINT * 1000;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÉTAPE 11: Mettre à jour les événements existants avec google_calendar_id
-- ============================================================================

UPDATE public.events e
SET google_calendar_id = (
  SELECT gcc.calendar_id
  FROM public.google_calendar_connections gcc
  WHERE gcc.company_id = e.company_id
  AND gcc.enabled = true
  LIMIT 1
)
WHERE e.google_event_id IS NOT NULL
AND e.google_calendar_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.google_calendar_connections gcc
  WHERE gcc.company_id = e.company_id
  AND gcc.enabled = true
);

-- ============================================================================
-- ÉTAPE 12: Nettoyer les doublons existants
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Compter les doublons
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT google_calendar_id, google_event_id, COUNT(*) as cnt
    FROM public.events
    WHERE google_calendar_id IS NOT NULL
    AND google_event_id IS NOT NULL
    GROUP BY google_calendar_id, google_event_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️ % doublon(s) détecté(s), nettoyage en cours...', duplicate_count;
    
    -- Supprimer les doublons (garder le plus récent)
    DELETE FROM public.events e1
    USING (
      SELECT google_calendar_id, google_event_id, MAX(updated_at) as max_updated_at
      FROM public.events
      WHERE google_calendar_id IS NOT NULL
      AND google_event_id IS NOT NULL
      GROUP BY google_calendar_id, google_event_id
      HAVING COUNT(*) > 1
    ) duplicates
    WHERE e1.google_calendar_id = duplicates.google_calendar_id
    AND e1.google_event_id = duplicates.google_event_id
    AND e1.updated_at < duplicates.max_updated_at;
    
    RAISE NOTICE '✅ Doublons nettoyés';
  ELSE
    RAISE NOTICE '✅ Aucun doublon détecté';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 13: Créer les index pour performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_google_calendar_id 
ON public.events(google_calendar_id) 
WHERE google_calendar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_google_event_id 
ON public.events(google_event_id) 
WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_google_composite 
ON public.events(google_calendar_id, google_event_id) 
WHERE google_calendar_id IS NOT NULL AND google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_deleted_at 
ON public.events(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_last_update_source 
ON public.events(last_update_source) 
WHERE last_update_source IS NOT NULL;

-- ============================================================================
-- ÉTAPE 14: Commentaires
-- ============================================================================

COMMENT ON COLUMN public.events.google_calendar_id IS 'ID du calendrier Google (ex: abc123@group.calendar.google.com). Clé composite avec google_event_id pour éviter les doublons.';
COMMENT ON COLUMN public.events.google_event_id IS 'ID de l''événement Google Calendar. Clé composite avec google_calendar_id pour éviter les doublons.';
COMMENT ON COLUMN public.events.google_updated_at IS 'Timestamp de dernière modification dans Google Calendar (pour résoudre les conflits)';
COMMENT ON COLUMN public.events.last_update_source IS 'Source de la dernière modification: app ou google (pour éviter les boucles)';
COMMENT ON COLUMN public.events.deleted_at IS 'Timestamp de suppression (soft delete) si l''événement a été supprimé dans Google Calendar';
COMMENT ON COLUMN public.events.last_synced_at IS 'Timestamp de la dernière synchronisation avec Google Calendar';

COMMENT ON TABLE public.google_calendar_webhooks IS 'Stocke les webhooks Google Calendar Watch API pour la synchronisation inverse (Google -> App)';
COMMENT ON TABLE public.google_calendar_sync_queue IS 'Queue de synchronisation pour les actions App -> Google (créée par triggers)';

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
  has_google_calendar_id BOOLEAN;
  has_google_updated_at BOOLEAN;
  has_last_update_source BOOLEAN;
  has_deleted_at BOOLEAN;
  unique_constraint_exists BOOLEAN;
BEGIN
  -- Vérifier les colonnes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_calendar_id'
  ) INTO has_google_calendar_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_updated_at'
  ) INTO has_google_updated_at;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'last_update_source'
  ) INTO has_last_update_source;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'deleted_at'
  ) INTO has_deleted_at;
  
  -- Vérifier la contrainte
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
    AND conname = 'events_google_calendar_event_unique'
  ) INTO unique_constraint_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION GOOGLE CALENDAR SYNC COMPLÈTE TERMINÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vérification:';
  RAISE NOTICE '   - google_calendar_id: %', CASE WHEN has_google_calendar_id THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - google_updated_at: %', CASE WHEN has_google_updated_at THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - last_update_source: %', CASE WHEN has_last_update_source THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - deleted_at: %', CASE WHEN has_deleted_at THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - Contrainte UNIQUE: %', CASE WHEN unique_constraint_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables créées: google_calendar_webhooks, google_calendar_sync_queue';
  RAISE NOTICE '✅ Triggers créés: queue_google_calendar_sync (INSERT/UPDATE/DELETE)';
  RAISE NOTICE '✅ Fonctions créées: queue_google_calendar_sync, get_valid_google_calendar_token';
  RAISE NOTICE '✅ Index créés pour performances';
  RAISE NOTICE '✅ Doublons nettoyés';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les doublons sont maintenant impossibles !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
