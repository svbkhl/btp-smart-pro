-- ============================================
-- FIX COMPLET MULTI-TENANT - SOLUTION ULTIME
-- ============================================
-- Ce script corrige TOUS les problèmes d'isolation multi-tenant :
-- 1. Vérifie/crée la fonction current_company_id()
-- 2. Active RLS sur toutes les tables métier
-- 3. Crée les policies strictes pour toutes les tables
-- 4. Vérifie/crée les triggers force_company_id
-- 5. Nettoie les données orphelines
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard > SQL Editor
-- 2. Copiez TOUT le contenu de ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez sur "Run"
-- 5. Vérifiez les résultats dans les messages NOTICE/WARNING
-- ============================================

-- ============================================
-- ÉTAPE 1 : VÉRIFIER/CRÉER LA FONCTION current_company_id()
-- ============================================

-- Créer ou remplacer la fonction current_company_id()
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté depuis company_users
  SELECT company_id INTO v_company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  AND (
    -- Si la colonne status existe, vérifier qu'elle est 'active'
    NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_users' 
      AND column_name = 'status'
    )
    OR status = 'active'
  )
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

-- Vérifier que la fonction a été créée
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'current_company_id'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✅ Fonction current_company_id() créée/vérifiée';
  ELSE
    RAISE WARNING '⚠️  Fonction current_company_id() n''a pas pu être créée';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : VÉRIFIER/CRÉER LES TRIGGERS force_company_id
-- ============================================

-- Créer ou remplacer la fonction trigger force_company_id
CREATE OR REPLACE FUNCTION public.force_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  v_company_id := public.current_company_id();
  
  -- Si company_id n'est pas défini, utiliser celui de la session JWT si disponible
  IF v_company_id IS NULL THEN
    -- Essayer de récupérer depuis le JWT (si configuré)
    v_company_id := (current_setting('request.jwt.claims', true)::json->>'company_id')::UUID;
  END IF;
  
  -- Si toujours NULL, essayer de récupérer depuis company_users
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.company_users
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Forcer company_id si la colonne existe
  IF TG_TABLE_NAME IN (
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'company_id'
  ) THEN
    NEW.company_id := v_company_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Vérifier que la fonction trigger a été créée
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'force_company_id'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✅ Fonction trigger force_company_id() créée/remplacée';
  ELSE
    RAISE WARNING '⚠️  Fonction trigger force_company_id() n''a pas pu être créée';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 3 : ACTIVER RLS ET CRÉER LES POLICIES
-- ============================================

DO $$
DECLARE
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'clients',
    'projects',
    'invoices',
    'ai_quotes',
    'events',
    'employees',
    'notifications',
    'payments',
    'ai_conversations',
    'ai_messages',
    'maintenance_reminders',
    'image_analysis'
  ];
  v_has_company_id BOOLEAN;
  v_policy_name TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ACTIVATION RLS ET CRÉATION POLICIES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    -- Vérifier si la table existe
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      RAISE NOTICE 'Traitement de la table: %', v_table_name;
      
      -- Activer RLS
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
        RAISE NOTICE '  ✅ RLS activé';
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '  ⚠️  Erreur activation RLS: %', SQLERRM;
      END;
      
      -- Supprimer toutes les anciennes policies
      BEGIN
        FOR v_policy_name IN
          SELECT policyname 
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = v_table_name
        LOOP
          BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I CASCADE', v_policy_name, v_table_name);
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '    ⚠️  Erreur suppression policy %: %', v_policy_name, SQLERRM;
          END;
        END LOOP;
        RAISE NOTICE '  ✅ Anciennes policies supprimées';
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '  ⚠️  Erreur suppression policies: %', SQLERRM;
      END;
      
      -- Vérifier si company_id existe
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name 
        AND column_name = 'company_id'
      ) INTO v_has_company_id;
      
      IF v_has_company_id THEN
        -- Créer les policies strictes
        
        -- Policy SELECT
        BEGIN
          EXECUTE format('
            CREATE POLICY "%s_select_strict"
            ON public.%I
            FOR SELECT
            TO authenticated
            USING (
              company_id IS NOT NULL
              AND public.current_company_id() IS NOT NULL
              AND company_id = public.current_company_id()
            )', v_table_name || '_select', v_table_name);
          RAISE NOTICE '  ✅ Policy SELECT créée';
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️  Erreur création SELECT policy: %', SQLERRM;
        END;
        
        -- Policy INSERT
        BEGIN
          EXECUTE format('
            CREATE POLICY "%s_insert_strict"
            ON public.%I
            FOR INSERT
            TO authenticated
            WITH CHECK (
              company_id IS NOT NULL
              AND public.current_company_id() IS NOT NULL
              AND company_id = public.current_company_id()
            )', v_table_name || '_insert', v_table_name);
          RAISE NOTICE '  ✅ Policy INSERT créée';
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️  Erreur création INSERT policy: %', SQLERRM;
        END;
        
        -- Policy UPDATE
        BEGIN
          EXECUTE format('
            CREATE POLICY "%s_update_strict"
            ON public.%I
            FOR UPDATE
            TO authenticated
            USING (
              company_id IS NOT NULL
              AND public.current_company_id() IS NOT NULL
              AND company_id = public.current_company_id()
            )
            WITH CHECK (
              company_id IS NOT NULL
              AND public.current_company_id() IS NOT NULL
              AND company_id = public.current_company_id()
            )', v_table_name || '_update', v_table_name);
          RAISE NOTICE '  ✅ Policy UPDATE créée';
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️  Erreur création UPDATE policy: %', SQLERRM;
        END;
        
        -- Policy DELETE
        BEGIN
          EXECUTE format('
            CREATE POLICY "%s_delete_strict"
            ON public.%I
            FOR DELETE
            TO authenticated
            USING (
              company_id IS NOT NULL
              AND public.current_company_id() IS NOT NULL
              AND company_id = public.current_company_id()
            )', v_table_name || '_delete', v_table_name);
          RAISE NOTICE '  ✅ Policy DELETE créée';
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️  Erreur création DELETE policy: %', SQLERRM;
        END;
        
        -- Créer ou remplacer le trigger force_company_id
        BEGIN
          -- Supprimer le trigger s'il existe
          EXECUTE format('DROP TRIGGER IF EXISTS force_company_id ON public.%I', v_table_name);
          
          -- Créer le trigger
          EXECUTE format('
            CREATE TRIGGER force_company_id
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.force_company_id()', v_table_name);
          
          RAISE NOTICE '  ✅ Trigger force_company_id créé/activé';
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️  Erreur création trigger: %', SQLERRM;
        END;
        
      ELSE
        RAISE WARNING '  ⚠️  Table % n''a pas de colonne company_id - policies non créées', v_table_name;
      END IF;
      
      RAISE NOTICE '';
    ELSE
      RAISE NOTICE 'ℹ️  Table % n''existe pas - ignorée', v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TRAITEMENT TERMINÉ';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ÉTAPE 4 : NETTOYER LES DONNÉES ORPHELINES
-- ============================================

DO $$
DECLARE
  v_table_name TEXT;
  v_null_count INTEGER;
  v_tables TEXT[] := ARRAY[
    'clients',
    'projects',
    'invoices',
    'ai_quotes',
    'events',
    'employees',
    'notifications',
    'payments',
    'ai_conversations',
    'ai_messages',
    'maintenance_reminders',
    'image_analysis'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NETTOYAGE DES DONNÉES ORPHELINES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name 
        AND column_name = 'company_id'
      ) THEN
        -- Compter les enregistrements sans company_id
        EXECUTE format('SELECT COUNT(*)::INTEGER FROM public.%I WHERE company_id IS NULL', v_table_name) INTO v_null_count;
        
        IF v_null_count > 0 THEN
          RAISE WARNING '  ⚠️  % - % enregistrement(s) sans company_id', v_table_name, v_null_count;
          RAISE NOTICE '     Tentative de correction...';
          
          -- Essayer de corriger en utilisant user_id
          BEGIN
            EXECUTE format('
              UPDATE public.%I 
              SET company_id = (
                SELECT company_id 
                FROM public.company_users 
                WHERE user_id = %I.user_id 
                ORDER BY created_at ASC 
                LIMIT 1
              )
              WHERE company_id IS NULL
              AND user_id IS NOT NULL', v_table_name, v_table_name);
            
            -- Recompter
            EXECUTE format('SELECT COUNT(*)::INTEGER FROM public.%I WHERE company_id IS NULL', v_table_name) INTO v_null_count;
            
            IF v_null_count > 0 THEN
              RAISE WARNING '     ⚠️  % enregistrement(s) non corrigés (sans user_id valide)', v_null_count;
            ELSE
              RAISE NOTICE '     ✅ Tous les enregistrements corrigés';
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '     ⚠️  Erreur lors de la correction: %', SQLERRM;
          END;
        ELSE
          RAISE NOTICE '  ✅ % - Aucun enregistrement sans company_id', v_table_name;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ÉTAPE 5 : RAPPORT FINAL
-- ============================================

SELECT 
  t.table_name as "Table",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name 
      AND column_name = 'company_id'
    ) THEN '✅'
    ELSE '❌'
  END as "company_id",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name 
      AND column_name = 'company_id'
      AND is_nullable = 'NO'
    ) THEN '✅ NOT NULL'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name 
      AND column_name = 'company_id'
    ) THEN '⚠️ NULLABLE'
    ELSE '❌ MANQUANT'
  END as "Status",
  CASE 
    WHEN relforcerowsecurity THEN '✅'
    ELSE '❌'
  END as "RLS",
  (
    SELECT COUNT(*)::TEXT
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = t.table_name
  ) as "Policies",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgrelid = ('public.' || t.table_name)::regclass 
      AND tgname = 'force_company_id'
      AND tgenabled = 'O'
    ) THEN '✅'
    ELSE '⚠️'
  END as "Trigger"
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = 'public'::regnamespace
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
    'clients', 'projects', 'invoices', 'ai_quotes', 'events', 
    'employees', 'notifications', 'payments', 'ai_conversations', 
    'ai_messages', 'maintenance_reminders', 'image_analysis'
  )
ORDER BY t.table_name;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLET TERMINÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Vérifiez le tableau ci-dessus pour confirmer que :';
  RAISE NOTICE '  - Toutes les tables ont company_id ✅';
  RAISE NOTICE '  - Toutes les tables ont RLS ✅';
  RAISE NOTICE '  - Toutes les tables ont 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - Toutes les tables ont le trigger force_company_id ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Si des problèmes persistent, exécutez :';
  RAISE NOTICE '  supabase/DIAGNOSTIC-ETAT-ACTUEL.sql';
  RAISE NOTICE '========================================';
END $$;
