-- ============================================================================
-- 🔥 FIX PRODUCTION READY - Google Calendar Integration
-- ============================================================================
-- Description: Corrections critiques pour production SaaS
--              1. Contrainte UNIQUE anti-doublons
--              2. RLS multi-tenant sécurisé
--              3. Vérifications de cohérence
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Vérifier/Ajouter company_id à events si manquant
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    -- Mettre à jour les événements existants avec company_id depuis user_id
    UPDATE public.events e
    SET company_id = (
      SELECT cu.company_id
      FROM public.company_users cu
      WHERE cu.user_id = e.user_id
      LIMIT 1
    )
    WHERE e.company_id IS NULL;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à events';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: Vérifier/Appliquer contrainte UNIQUE (google_calendar_id, google_event_id)
-- ============================================================================

-- Supprimer les anciennes contraintes UNIQUE sur google_event_id seul
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

-- Supprimer l'ancienne contrainte si elle existe (pour récréer proprement)
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_google_calendar_event_unique;

-- Créer la contrainte UNIQUE (NULL values traités comme distincts)
ALTER TABLE public.events
ADD CONSTRAINT events_google_calendar_event_unique
UNIQUE(google_calendar_id, google_event_id);

-- Index partiel pour performances
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_google_composite_partial
ON public.events(google_calendar_id, google_event_id)
WHERE google_calendar_id IS NOT NULL AND google_event_id IS NOT NULL;

-- ============================================================================
-- ÉTAPE 3: Nettoyer les doublons existants (garder le plus récent)
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
-- ÉTAPE 4: Corriger RLS Policies pour multi-tenant (company_id)
-- ============================================================================

-- Supprimer les anciennes policies basées uniquement sur user_id
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

-- Supprimer aussi les policies qui pourraient exister avec d'autres noms
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', policy_name);
    RAISE NOTICE '🗑️ Policy supprimée: %', policy_name;
  END LOOP;
END $$;

-- ⚠️ NOUVELLES POLICIES MULTI-TENANT SÉCURISÉES

-- SELECT: Les utilisateurs peuvent voir les événements de leur company
CREATE POLICY "Company users can view events"
ON public.events FOR SELECT
USING (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- INSERT: Les utilisateurs peuvent créer des événements dans leur company
CREATE POLICY "Company users can insert events"
ON public.events FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- UPDATE: Les utilisateurs peuvent modifier les événements de leur company
CREATE POLICY "Company users can update events"
ON public.events FOR UPDATE
USING (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- DELETE: Les utilisateurs peuvent supprimer les événements de leur company
CREATE POLICY "Company users can delete events"
ON public.events FOR DELETE
USING (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- ============================================================================
-- ÉTAPE 5: Vérifier/Ajouter toutes les colonnes Google nécessaires
-- ============================================================================

DO $$
BEGIN
  -- google_calendar_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_calendar_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_calendar_id TEXT;
    RAISE NOTICE '✅ google_calendar_id ajouté';
  END IF;

  -- google_event_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_event_id TEXT;
    RAISE NOTICE '✅ google_event_id ajouté';
  END IF;

  -- google_updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_updated_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_updated_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ google_updated_at ajouté';
  END IF;

  -- last_update_source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'last_update_source'
  ) THEN
    -- Vérifier si updated_source existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'updated_source'
    ) THEN
      ALTER TABLE public.events RENAME COLUMN updated_source TO last_update_source;
      RAISE NOTICE '✅ updated_source renommé en last_update_source';
    ELSE
      ALTER TABLE public.events ADD COLUMN last_update_source TEXT DEFAULT 'app' 
        CHECK (last_update_source IN ('app', 'google'));
      RAISE NOTICE '✅ last_update_source ajouté';
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
    RAISE NOTICE '✅ last_synced_at ajouté';
  END IF;

  -- deleted_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ deleted_at ajouté';
  END IF;

  -- synced_with_google
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'synced_with_google'
  ) THEN
    ALTER TABLE public.events ADD COLUMN synced_with_google BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ synced_with_google ajouté';
  END IF;

  -- google_sync_error
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_sync_error'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_sync_error TEXT;
    RAISE NOTICE '✅ google_sync_error ajouté';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 6: Créer les index pour performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_company_id 
ON public.events(company_id) 
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_user_id 
ON public.events(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_google_calendar_id 
ON public.events(google_calendar_id) 
WHERE google_calendar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_google_event_id 
ON public.events(google_event_id) 
WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_start_date 
ON public.events(start_date);

CREATE INDEX IF NOT EXISTS idx_events_deleted_at 
ON public.events(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_last_update_source 
ON public.events(last_update_source) 
WHERE last_update_source IS NOT NULL;

-- ============================================================================
-- ÉTAPE 7: Vérification finale
-- ============================================================================

DO $$
DECLARE
  has_company_id BOOLEAN;
  has_unique_constraint BOOLEAN;
  has_google_calendar_id BOOLEAN;
  has_google_event_id BOOLEAN;
  has_last_update_source BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Vérifier colonnes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'company_id'
  ) INTO has_company_id;
  
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
    AND column_name = 'google_event_id'
  ) INTO has_google_event_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'last_update_source'
  ) INTO has_last_update_source;
  
  -- Vérifier contrainte UNIQUE
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
    AND conname = 'events_google_calendar_event_unique'
  ) INTO has_unique_constraint;
  
  -- Compter policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'events';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX PRODUCTION READY - GOOGLE CALENDAR';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vérification:';
  RAISE NOTICE '   - company_id: %', CASE WHEN has_company_id THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - google_calendar_id: %', CASE WHEN has_google_calendar_id THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - google_event_id: %', CASE WHEN has_google_event_id THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - last_update_source: %', CASE WHEN has_last_update_source THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - Contrainte UNIQUE: %', CASE WHEN has_unique_constraint THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - Policies RLS: %', policy_count;
  RAISE NOTICE '';
  
  IF has_company_id AND has_unique_constraint AND policy_count >= 4 THEN
    RAISE NOTICE '✅ Configuration prête pour production !';
  ELSE
    RAISE WARNING '⚠️ Certaines vérifications ont échoué - revoir la configuration';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
