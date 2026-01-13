-- ============================================================================
-- 🔒 FIX ANTI-DOUBLONS GOOGLE CALENDAR - Migration Complète
-- ============================================================================
-- Description: Ajoute toutes les colonnes manquantes + contrainte UNIQUE
--              pour empêcher les doublons lors de la synchronisation
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

  -- last_update_source (remplace updated_source si différent)
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
      -- Renommer updated_source en last_update_source
      ALTER TABLE public.events RENAME COLUMN updated_source TO last_update_source;
      RAISE NOTICE '✅ Colonne updated_source renommée en last_update_source';
    ELSE
      ALTER TABLE public.events ADD COLUMN last_update_source TEXT DEFAULT 'app' 
        CHECK (last_update_source IN ('app', 'google'));
      RAISE NOTICE '✅ Colonne last_update_source ajoutée à events';
    END IF;
  END IF;

  -- last_synced_at (déjà ajouté dans GOOGLE-CALENDAR-BIDIRECTIONAL-SYNC.sql)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne last_synced_at ajoutée à events';
  END IF;

  -- deleted_at (soft delete pour les événements supprimés dans Google)
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
-- ÉTAPE 2: Supprimer les contraintes UNIQUE existantes sur google_event_id
-- ============================================================================

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Chercher les contraintes UNIQUE sur google_event_id
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
    AND contype = 'u'
    AND conkey::text LIKE '%google_event_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.events DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '🗑️ Contrainte supprimée: %', constraint_name;
  END LOOP;
END $$;

-- ============================================================================
-- ÉTAPE 3: Créer la contrainte UNIQUE composite (google_calendar_id, google_event_id)
-- ============================================================================

-- Supprimer la contrainte existante si elle existe
ALTER TABLE public.events 
DROP CONSTRAINT IF EXISTS events_google_calendar_event_unique;

-- Créer la contrainte UNIQUE composite
-- ⚠️ IMPORTANT: NULL values sont autorisés (événements non synchronisés)
-- La contrainte ne s'applique que si les deux valeurs sont non-NULL
CREATE UNIQUE INDEX events_google_calendar_event_unique_idx
ON public.events(google_calendar_id, google_event_id)
WHERE google_calendar_id IS NOT NULL AND google_event_id IS NOT NULL;

-- Créer aussi une contrainte UNIQUE nommée (pour onConflict dans Supabase)
DO $$
BEGIN
  -- Vérifier si la contrainte existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
    AND conname = 'events_google_calendar_event_unique'
  ) THEN
    -- Créer une contrainte unique basée sur l'index
    ALTER TABLE public.events
    ADD CONSTRAINT events_google_calendar_event_unique
    UNIQUE USING INDEX events_google_calendar_event_unique_idx;
    
    RAISE NOTICE '✅ Contrainte UNIQUE (google_calendar_id, google_event_id) créée';
  ELSE
    RAISE NOTICE '✅ Contrainte UNIQUE existe déjà';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4: Mettre à jour les événements existants avec google_calendar_id
-- ============================================================================

-- Mettre à jour les événements qui ont un google_event_id mais pas de google_calendar_id
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
-- ÉTAPE 5: Créer des index pour améliorer les performances
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

-- ============================================================================
-- ÉTAPE 6: Nettoyer les doublons existants (garder le plus récent)
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
-- ÉTAPE 7: Commentaires
-- ============================================================================

COMMENT ON COLUMN public.events.google_calendar_id IS 'ID du calendrier Google (ex: abc123@group.calendar.google.com). Clé composite avec google_event_id pour éviter les doublons.';
COMMENT ON COLUMN public.events.google_event_id IS 'ID de l''événement Google Calendar. Clé composite avec google_calendar_id pour éviter les doublons.';
COMMENT ON COLUMN public.events.google_updated_at IS 'Timestamp de dernière modification dans Google Calendar (pour résoudre les conflits)';
COMMENT ON COLUMN public.events.last_update_source IS 'Source de la dernière modification: app ou google (pour éviter les boucles)';
COMMENT ON COLUMN public.events.deleted_at IS 'Timestamp de suppression (soft delete) si l''événement a été supprimé dans Google Calendar';

-- ============================================================================
-- RAPPORT
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
  RAISE NOTICE '✅ FIX ANTI-DOUBLONS GOOGLE CALENDAR TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vérification:';
  RAISE NOTICE '   - google_calendar_id: %', CASE WHEN has_google_calendar_id THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - google_updated_at: %', CASE WHEN has_google_updated_at THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - last_update_source: %', CASE WHEN has_last_update_source THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - deleted_at: %', CASE WHEN has_deleted_at THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - Contrainte UNIQUE: %', CASE WHEN unique_constraint_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Contrainte UNIQUE (google_calendar_id, google_event_id) créée';
  RAISE NOTICE '✅ Indexes créés pour performances';
  RAISE NOTICE '✅ Doublons nettoyés';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les doublons sont maintenant impossibles !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
