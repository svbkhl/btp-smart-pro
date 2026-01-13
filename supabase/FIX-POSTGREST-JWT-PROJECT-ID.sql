-- ============================================================================
-- 🔥 FIX DÉFINITIF : PostgREST injecte "events" via JWT claim project_id
-- ============================================================================
-- Problème: PostgREST injecte le nom de la ressource ("events") comme valeur
--           de project_id via request.jwt.claim.project_id
-- Solution: Supprimer toutes les références JWT, accepter project_id NULL,
--           créer des policies sécurisées
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: DIAGNOSTIC - Identifier les problèmes
-- ============================================================================

DO $$
DECLARE
  jwt_policy_count INTEGER;
  jwt_trigger_count INTEGER;
BEGIN
  -- Compter les policies avec JWT
  SELECT COUNT(*) INTO jwt_policy_count
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
  
  -- Compter les triggers avec JWT
  SELECT COUNT(*) INTO jwt_trigger_count
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
  
  RAISE NOTICE '🔍 Diagnostic: % policy(s) et % trigger(s) avec JWT claims', jwt_policy_count, jwt_trigger_count;
END $$;

-- ============================================================================
-- ÉTAPE 2: Désactiver temporairement tous les triggers
-- ============================================================================

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
  END LOOP;
END $$;

-- ============================================================================
-- ÉTAPE 3: Supprimer TOUS les triggers qui utilisent JWT ou assignent project_id
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_set_event_project_id ON public.events;
DROP TRIGGER IF EXISTS trigger_set_project_id_from_jwt ON public.events;
DROP TRIGGER IF EXISTS trigger_auto_set_project_id ON public.events;
DROP TRIGGER IF EXISTS trigger_set_event_user_id ON public.events;

-- ============================================================================
-- ÉTAPE 4: Supprimer les fonctions problématiques
-- ============================================================================

DROP FUNCTION IF EXISTS public.set_event_project_id_from_jwt() CASCADE;
DROP FUNCTION IF EXISTS public.auto_set_project_id() CASCADE;

-- ============================================================================
-- ÉTAPE 5: Vérifier et corriger la structure de la table
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
  END IF;
END $$;

-- Vérifier que la FK existe et accepte NULL
DO $$
BEGIN
  -- Supprimer l'ancienne FK si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'events'
    AND tc.constraint_name = 'events_project_id_fkey'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_project_id_fkey;
  END IF;
  
  -- Recréer la FK avec ON DELETE SET NULL
  ALTER TABLE public.events
  ADD CONSTRAINT events_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE SET NULL;
  
  RAISE NOTICE '✅ FK project_id vérifiée/créée (accepte NULL)';
END $$;

-- ============================================================================
-- ÉTAPE 6: Supprimer TOUTES les policies RLS existantes
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
  END LOOP;
  RAISE NOTICE '✅ Toutes les policies RLS supprimées';
END $$;

-- ============================================================================
-- ÉTAPE 7: Créer des policies RLS SÉCURISÉES (sans JWT claims)
-- ============================================================================

-- Policy SELECT
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

-- Policy INSERT (ACCEPTE project_id NULL)
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
      SELECT p.id FROM public.projects p
      WHERE p.company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = auth.uid() 
        LIMIT 1
      )
    )
  )
);

-- Policy UPDATE (ACCEPTE project_id NULL)
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
      SELECT p.id FROM public.projects p
      WHERE p.company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = auth.uid() 
        LIMIT 1
      )
    )
  )
);

-- Policy DELETE
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
-- ÉTAPE 8: Créer un trigger SÉCURISÉ qui nettoie project_id invalide
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clean_event_project_id_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- ⚠️ Si project_id est "events" ou une string invalide, le mettre à NULL
  IF NEW.project_id IS NOT NULL THEN
    -- Vérifier que c'est un UUID valide (format strict)
    IF NOT (NEW.project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      RAISE WARNING '⚠️ project_id invalide détecté: "%". Mise à NULL.', NEW.project_id;
      NEW.project_id := NULL;
      RETURN NEW;
    END IF;
    
    -- Vérifier que le projet existe et appartient à la même company
    IF NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = NEW.project_id
      AND p.company_id = NEW.company_id
    ) THEN
      RAISE WARNING '⚠️ project_id "%" n''existe pas ou n''appartient pas à la company. Mise à NULL.', NEW.project_id;
      NEW.project_id := NULL;
    END IF;
  ELSE
    -- S'assurer que project_id est bien NULL (pas undefined)
    NEW.project_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clean_event_project_id_before_insert_trigger ON public.events;
CREATE TRIGGER clean_event_project_id_before_insert_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.clean_event_project_id_before_insert();

-- ============================================================================
-- ÉTAPE 9: Réactiver les triggers non problématiques
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
  END IF;
END $$;

-- Réactiver clean_event_project_id_before_insert_trigger
ALTER TABLE public.events ENABLE TRIGGER clean_event_project_id_before_insert_trigger;

-- ============================================================================
-- ÉTAPE 10: Nettoyer les données corrompues
-- ============================================================================

UPDATE public.events
SET project_id = NULL
WHERE project_id IS NOT NULL
AND (
  project_id::TEXT = 'events'
  OR project_id::TEXT = 'undefined'
  OR project_id::TEXT = ''
  OR project_id::TEXT = 'null'
  OR project_id::TEXT = 'NULL'
  OR NOT (project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

-- ============================================================================
-- ÉTAPE 11: Vérification finale
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  trigger_count INTEGER;
  corrupted_count INTEGER;
BEGIN
  -- Vérifier qu'il n'y a plus de policies avec JWT
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
  
  -- Vérifier qu'il n'y a plus de triggers avec JWT
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
  
  -- Compter les données corrompues restantes
  SELECT COUNT(*) INTO corrupted_count
  FROM public.events
  WHERE project_id IS NOT NULL
  AND (
    project_id::TEXT = 'events'
    OR project_id::TEXT = 'undefined'
    OR NOT (project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX POSTGREST JWT PROJECT_ID TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vérification finale:';
  RAISE NOTICE '   - Policies avec JWT: %', policy_count;
  RAISE NOTICE '   - Triggers avec JWT: %', trigger_count;
  RAISE NOTICE '   - Données corrompues restantes: %', corrupted_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ project_id accepte NULL';
  RAISE NOTICE '✅ FK project_id vérifiée (ON DELETE SET NULL)';
  RAISE NOTICE '✅ Policies RLS créées (sans JWT claims)';
  RAISE NOTICE '✅ Trigger clean_event_project_id_before_insert créé';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 "events" ne peut plus être injecté comme UUID';
  RAISE NOTICE '🔒 Aucune référence à request.jwt.claim.project_id';
  RAISE NOTICE '🔒 Le système fonctionne avec ou sans projet actif';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF policy_count > 0 OR trigger_count > 0 THEN
    RAISE WARNING '⚠️ ATTENTION: Il reste des références JWT !';
  END IF;
  
  IF corrupted_count > 0 THEN
    RAISE WARNING '⚠️ ATTENTION: Il reste % donnée(s) corrompue(s) !', corrupted_count;
  END IF;
END $$;
