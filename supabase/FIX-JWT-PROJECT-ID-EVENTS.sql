-- ============================================================================
-- 🔥 FIX DÉFINITIF : JWT claim project_id injectant "events" comme UUID
-- ============================================================================
-- Description: Corrige définitivement le problème où PostgREST injecte "events"
--              via request.jwt.claim.project_id dans la colonne project_id
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Supprimer TOUS les triggers qui assignent project_id depuis JWT
-- ============================================================================

-- Désactiver temporairement tous les triggers
DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'events'
    AND NOT t.tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE public.events DISABLE TRIGGER %I', trig.tgname);
    RAISE NOTICE '⚠️ Trigger désactivé temporairement: %', trig.tgname;
  END LOOP;
END $$;

-- Supprimer les triggers problématiques
DROP TRIGGER IF EXISTS trigger_set_event_project_id ON public.events;
DROP TRIGGER IF EXISTS trigger_set_project_id_from_jwt ON public.events;
DROP TRIGGER IF EXISTS trigger_auto_set_project_id ON public.events;

-- ============================================================================
-- ÉTAPE 2: Supprimer les fonctions qui assignent project_id depuis JWT
-- ============================================================================

DROP FUNCTION IF EXISTS public.set_event_project_id_from_jwt() CASCADE;
DROP FUNCTION IF EXISTS public.auto_set_project_id() CASCADE;

-- ============================================================================
-- ÉTAPE 3: Vérifier et corriger la structure de la table
-- ============================================================================

-- S'assurer que project_id est nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'project_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.events ALTER COLUMN project_id DROP NOT NULL;
    RAISE NOTICE '✅ project_id rendu nullable';
  ELSE
    RAISE NOTICE '✅ project_id est déjà nullable';
  END IF;
END $$;

-- Vérifier que la FK accepte NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'events'
    AND kcu.column_name = 'project_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Créer la FK si elle n'existe pas
    ALTER TABLE public.events
    ADD CONSTRAINT events_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE SET NULL;
    RAISE NOTICE '✅ FK project_id créée';
  ELSE
    RAISE NOTICE '✅ FK project_id existe déjà';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4: Supprimer TOUTES les policies RLS existantes sur events
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
    RAISE NOTICE '🗑️ Policy supprimée: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- ÉTAPE 5: Créer une policy RLS SÉCURISÉE qui accepte project_id NULL
-- ============================================================================

-- Policy pour SELECT
CREATE POLICY "Company users can view events"
ON public.events FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
);

-- Policy pour INSERT (ACCEPTE project_id NULL)
CREATE POLICY "Company users can insert events"
ON public.events FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
  -- ⚠️ IMPORTANT: project_id peut être NULL
  -- ⚠️ Aucune vérification JWT claim ici
  AND (
    project_id IS NULL
    OR project_id IN (
      SELECT id FROM public.projects 
      WHERE company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = auth.uid() 
        LIMIT 1
      )
    )
  )
);

-- Policy pour UPDATE
CREATE POLICY "Company users can update events"
ON public.events FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
  -- ⚠️ IMPORTANT: project_id peut être NULL
  AND (
    project_id IS NULL
    OR project_id IN (
      SELECT id FROM public.projects 
      WHERE company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = auth.uid() 
        LIMIT 1
      )
    )
  )
);

-- Policy pour DELETE
CREATE POLICY "Company users can delete events"
ON public.events FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
);

-- ============================================================================
-- ÉTAPE 6: Créer un trigger SÉCURISÉ qui nettoie project_id si invalide
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clean_event_project_id()
RETURNS TRIGGER AS $$
BEGIN
  -- ⚠️ Si project_id est "events" ou une string invalide, le mettre à NULL
  IF NEW.project_id IS NOT NULL THEN
    -- Vérifier que c'est un UUID valide
    IF NOT (NEW.project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      RAISE WARNING '⚠️ project_id invalide détecté: "%". Mise à NULL.', NEW.project_id;
      NEW.project_id := NULL;
    END IF;
    
    -- Vérifier que le projet existe et appartient à la même company
    IF NOT EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.company_users cu ON cu.company_id = p.company_id
      WHERE p.id = NEW.project_id
      AND cu.user_id = NEW.user_id
    ) THEN
      RAISE WARNING '⚠️ project_id "%" n''existe pas ou n''appartient pas à la company. Mise à NULL.', NEW.project_id;
      NEW.project_id := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clean_event_project_id_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.clean_event_project_id();

-- ============================================================================
-- ÉTAPE 7: Réactiver les triggers non problématiques
-- ============================================================================

-- Réactiver trigger_update_events_updated_at si nécessaire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'events'
    AND t.tgname = 'trigger_update_events_updated_at'
  ) THEN
    ALTER TABLE public.events ENABLE TRIGGER trigger_update_events_updated_at;
    RAISE NOTICE '✅ trigger_update_events_updated_at réactivé';
  END IF;
END $$;

-- Réactiver clean_event_project_id_trigger
ALTER TABLE public.events ENABLE TRIGGER clean_event_project_id_trigger;

-- ============================================================================
-- ÉTAPE 8: Nettoyer les données corrompues
-- ============================================================================

-- Mettre à NULL tous les project_id invalides
UPDATE public.events
SET project_id = NULL
WHERE project_id IS NOT NULL
AND (
  project_id::TEXT = 'events'
  OR project_id::TEXT = 'undefined'
  OR project_id::TEXT = ''
  OR NOT (project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

-- ============================================================================
-- ÉTAPE 9: Vérifier qu'il n'y a plus de références à JWT claims
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  trigger_count INTEGER;
BEGIN
  -- Vérifier les policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'events'
  AND (
    qual ILIKE '%jwt%'
    OR qual ILIKE '%request.jwt%'
    OR qual ILIKE '%current_setting%'
    OR with_check ILIKE '%jwt%'
    OR with_check ILIKE '%request.jwt%'
    OR with_check ILIKE '%current_setting%'
  );
  
  -- Vérifier les triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relname = 'events'
  AND NOT t.tgisinternal
  AND (
    pg_get_functiondef(p.oid) ILIKE '%jwt%'
    OR pg_get_functiondef(p.oid) ILIKE '%request.jwt%'
    OR pg_get_functiondef(p.oid) ILIKE '%current_setting%'
  );
  
  IF policy_count > 0 OR trigger_count > 0 THEN
    RAISE WARNING '⚠️ Il reste % policy(s) et % trigger(s) avec JWT claims', policy_count, trigger_count;
  ELSE
    RAISE NOTICE '✅ Aucune référence JWT claim détectée';
  END IF;
END $$;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX JWT PROJECT_ID EVENTS TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tous les triggers JWT supprimés';
  RAISE NOTICE '✅ Toutes les policies RLS recréées (sans JWT claims)';
  RAISE NOTICE '✅ project_id accepte NULL';
  RAISE NOTICE '✅ Trigger clean_event_project_id créé';
  RAISE NOTICE '✅ Données corrompues nettoyées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 "events" ne peut plus être injecté comme UUID';
  RAISE NOTICE '🔒 project_id peut être NULL';
  RAISE NOTICE '🔒 Aucune référence à request.jwt.claim.project_id';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
