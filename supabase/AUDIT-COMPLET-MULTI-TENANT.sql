-- ============================================
-- AUDIT COMPLET MULTI-TENANT - CHECKLIST TECHNIQUE
-- ============================================
-- Ce script effectue une vérification complète de l'isolation multi-tenant
-- selon la checklist technique fournie
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard > SQL Editor
-- 2. Copiez TOUT le contenu de ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez sur "Run"
-- 5. Consultez les résultats dans les messages NOTICE/WARNING
-- ============================================

DO $$
DECLARE
  -- Variables pour le rapport
  v_table_name TEXT;
  v_has_company_id BOOLEAN;
  v_company_id_nullable BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_select_policy_exists BOOLEAN;
  v_insert_policy_exists BOOLEAN;
  v_update_policy_exists BOOLEAN;
  v_delete_policy_exists BOOLEAN;
  v_permissive_policies_count INTEGER;
  v_total_tables_ok INTEGER := 0;
  v_total_tables_ko INTEGER := 0;
  v_tables_ok TEXT[] := ARRAY[]::TEXT[];
  v_tables_ko TEXT[] := ARRAY[]::TEXT[];
  v_issues TEXT[] := ARRAY[]::TEXT[];
  
  -- Liste des tables métier à vérifier
  v_business_tables TEXT[] := ARRAY[
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
    'image_analysis',
    'assignments',
    'delegations'
  ];
  
  -- Tables non-métier (ne nécessitent pas d'isolation)
  v_non_business_tables TEXT[] := ARRAY[
    'profiles',
    'user_settings',
    'user_stats',
    'user_roles',
    'companies',
    'company_users',
    'company_invites'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUDIT COMPLET MULTI-TENANT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Date: %', CURRENT_TIMESTAMP;
  RAISE NOTICE '';
  
  -- ============================================
  -- 1. INVENTAIRE DES TABLES MÉTIER
  -- ============================================
  RAISE NOTICE '1. INVENTAIRE DES TABLES MÉTIER';
  RAISE NOTICE '----------------------------------------';
  
  FOREACH v_table_name IN ARRAY v_business_tables
  LOOP
    -- Vérifier si la table existe
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      -- Vérifier si company_id existe
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name 
        AND column_name = 'company_id'
      ) INTO v_has_company_id;
      
      IF v_has_company_id THEN
        -- Vérifier si company_id est nullable
        SELECT is_nullable = 'YES' INTO v_company_id_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name 
        AND column_name = 'company_id';
        
        IF v_company_id_nullable THEN
          v_tables_ko := array_append(v_tables_ko, v_table_name);
          v_issues := array_append(v_issues, format('%s: company_id est NULLABLE (FAIL)', v_table_name));
          RAISE WARNING '  ❌ % - company_id EXISTS mais est NULLABLE', v_table_name;
        ELSE
          v_tables_ok := array_append(v_tables_ok, v_table_name);
          RAISE NOTICE '  ✅ % - company_id EXISTS et NOT NULL', v_table_name;
        END IF;
      ELSE
        v_tables_ko := array_append(v_tables_ko, v_table_name);
        v_issues := array_append(v_issues, format('%s: company_id MANQUANT (FAIL)', v_table_name));
        RAISE WARNING '  ❌ % - company_id MANQUANT', v_table_name;
      END IF;
    ELSE
      RAISE NOTICE '  ℹ️  % - Table n''existe pas (ignorée)', v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- ============================================
  -- 2. VÉRIFICATION RLS
  -- ============================================
  RAISE NOTICE '2. VÉRIFICATION RLS PAR TABLE';
  RAISE NOTICE '----------------------------------------';
  
  FOREACH v_table_name IN ARRAY v_business_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      -- Vérifier si RLS est activé
      SELECT relforcerowsecurity INTO v_rls_enabled
      FROM pg_class 
      WHERE relname = v_table_name 
      AND relnamespace = 'public'::regnamespace;
      
      IF v_rls_enabled THEN
        -- Vérifier les policies
        SELECT 
          EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table_name AND cmd = 'SELECT'),
          EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table_name AND cmd = 'INSERT'),
          EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table_name AND cmd = 'UPDATE'),
          EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table_name AND cmd = 'DELETE'),
          COUNT(*)::INTEGER
        INTO 
          v_select_policy_exists,
          v_insert_policy_exists,
          v_update_policy_exists,
          v_delete_policy_exists,
          v_permissive_policies_count
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = v_table_name
        AND (qual::text LIKE '%true%' OR qual::text = 'true' OR with_check::text LIKE '%true%' OR with_check::text = 'true');
        
        RAISE NOTICE '  Table: %', v_table_name;
        RAISE NOTICE '    RLS: ✅ ACTIVÉ';
        RAISE NOTICE '    Policies:';
        RAISE NOTICE '      SELECT: %', CASE WHEN v_select_policy_exists THEN '✅' ELSE '❌ MANQUANTE' END;
        RAISE NOTICE '      INSERT: %', CASE WHEN v_insert_policy_exists THEN '✅' ELSE '❌ MANQUANTE' END;
        RAISE NOTICE '      UPDATE: %', CASE WHEN v_update_policy_exists THEN '✅' ELSE '❌ MANQUANTE' END;
        RAISE NOTICE '      DELETE: %', CASE WHEN v_delete_policy_exists THEN '✅' ELSE '❌ MANQUANTE' END;
        
        IF v_permissive_policies_count > 0 THEN
          RAISE WARNING '      ⚠️  % policy(ies) permissive(s) trouvée(s) (USING (true))', v_permissive_policies_count;
          v_issues := array_append(v_issues, format('%s: %s policy(ies) permissive(s) trouvée(s)', v_table_name, v_permissive_policies_count));
        ELSE
          RAISE NOTICE '      ✅ Aucune policy permissive (USING (true))';
        END IF;
        
        -- Vérifier la qualité des policies (doivent filtrer par company_id)
        DECLARE
          v_has_company_id_filter BOOLEAN;
        BEGIN
          SELECT EXISTS(
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = v_table_name 
            AND (
              qual::text LIKE '%company_id%' 
              OR with_check::text LIKE '%company_id%'
              OR qual::text LIKE '%current_company_id%'
              OR with_check::text LIKE '%current_company_id%'
            )
          ) INTO v_has_company_id_filter;
          
          IF NOT v_has_company_id_filter THEN
            RAISE WARNING '      ⚠️  Aucune policy ne filtre par company_id!';
            v_issues := array_append(v_issues, format('%s: Aucune policy ne filtre par company_id', v_table_name));
          ELSE
            RAISE NOTICE '      ✅ Policies filtrent par company_id';
          END IF;
        END;
        
      ELSE
        RAISE WARNING '  ❌ % - RLS NON ACTIVÉ!', v_table_name;
        v_issues := array_append(v_issues, format('%s: RLS non activé', v_table_name));
      END IF;
      
      RAISE NOTICE '';
    END IF;
  END LOOP;
  
  -- ============================================
  -- 3. VÉRIFICATION DES TRIGGERS
  -- ============================================
  RAISE NOTICE '3. VÉRIFICATION DES TRIGGERS force_company_id';
  RAISE NOTICE '----------------------------------------';
  
  FOREACH v_table_name IN ARRAY v_business_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgrelid = ('public.' || v_table_name)::regclass 
        AND tgname = 'force_company_id'
        AND tgenabled = 'O'
      ) THEN
        RAISE NOTICE '  ✅ % - Trigger force_company_id actif', v_table_name;
      ELSE
        RAISE WARNING '  ⚠️  % - Trigger force_company_id manquant ou inactif', v_table_name;
        v_issues := array_append(v_issues, format('%s: Trigger force_company_id manquant ou inactif', v_table_name));
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- ============================================
  -- 4. VÉRIFICATION DES DONNÉES ORPHELINES
  -- ============================================
  RAISE NOTICE '4. VÉRIFICATION DES DONNÉES SANS company_id';
  RAISE NOTICE '----------------------------------------';
  
  FOREACH v_table_name IN ARRAY v_business_tables
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
        DECLARE
          v_null_count INTEGER;
        BEGIN
          EXECUTE format('SELECT COUNT(*)::INTEGER FROM public.%I WHERE company_id IS NULL', v_table_name) INTO v_null_count;
          
          IF v_null_count > 0 THEN
            RAISE WARNING '  ⚠️  % - % enregistrement(s) sans company_id', v_table_name, v_null_count;
            v_issues := array_append(v_issues, format('%s: %s enregistrement(s) sans company_id', v_table_name, v_null_count));
          ELSE
            RAISE NOTICE '  ✅ % - Aucun enregistrement sans company_id', v_table_name;
          END IF;
        END;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- ============================================
  -- 5. RAPPORT FINAL
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RAPPORT FINAL';
  RAISE NOTICE '========================================';
  
  v_total_tables_ok := array_length(v_tables_ok, 1);
  v_total_tables_ko := array_length(v_tables_ko, 1);
  
  RAISE NOTICE 'Tables OK: % / %', v_total_tables_ok, array_length(v_business_tables, 1);
  IF v_total_tables_ok > 0 THEN
    RAISE NOTICE '  Liste: %', array_to_string(v_tables_ok, ', ');
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Tables KO: % / %', v_total_tables_ko, array_length(v_business_tables, 1);
  IF v_total_tables_ko > 0 THEN
    RAISE NOTICE '  Liste: %', array_to_string(v_tables_ko, ', ');
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Problèmes identifiés: %', array_length(v_issues, 1);
  IF array_length(v_issues, 1) > 0 THEN
    DECLARE
      v_issue TEXT;
    BEGIN
      FOREACH v_issue IN ARRAY v_issues
      LOOP
        RAISE WARNING '  - %', v_issue;
      END LOOP;
    END;
  END IF;
  
  RAISE NOTICE '';
  
  IF v_total_tables_ko = 0 AND array_length(v_issues, 1) = 0 THEN
    RAISE NOTICE '✅ AUDIT RÉUSSI: Toutes les tables sont correctement configurées pour l''isolation multi-tenant!';
  ELSE
    RAISE WARNING '⚠️  AUDIT ÉCHOUÉ: Des corrections sont nécessaires avant de garantir l''isolation multi-tenant.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Afficher un résumé visuel des tables et leur statut
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
  END as "RLS"
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
