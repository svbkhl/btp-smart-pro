-- ============================================
-- DIAGNOSTIC COMPLET DE L'ÉTAT ACTUEL
-- ============================================
-- Ce script vérifie l'état actuel après exécution des scripts de correction
-- et identifie les problèmes restants
-- ============================================

DO $$
DECLARE
  v_table_name TEXT;
  v_rls_enabled BOOLEAN;
  v_policies_count INTEGER;
  v_has_company_id BOOLEAN;
  v_company_id_nullable BOOLEAN;
  v_null_data_count INTEGER;
  v_trigger_exists BOOLEAN;
  v_total_ok INTEGER := 0;
  v_total_ko INTEGER := 0;
  v_issues TEXT[] := ARRAY[]::TEXT[];
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
  RAISE NOTICE 'DIAGNOSTIC COMPLET - ÉTAT ACTUEL';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Date: %', CURRENT_TIMESTAMP;
  RAISE NOTICE '';
  
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      RAISE NOTICE '----------------------------------------';
      RAISE NOTICE 'Table: %', v_table_name;
      RAISE NOTICE '----------------------------------------';
      
      -- 1. Vérifier RLS
      SELECT relforcerowsecurity INTO v_rls_enabled
      FROM pg_class 
      WHERE relname = v_table_name 
      AND relnamespace = 'public'::regnamespace;
      
      IF v_rls_enabled THEN
        RAISE NOTICE '  RLS: ✅ ACTIVÉ';
      ELSE
        RAISE WARNING '  RLS: ❌ DÉSACTIVÉ';
        v_total_ko := v_total_ko + 1;
        v_issues := array_append(v_issues, format('%s: RLS désactivé', v_table_name));
      END IF;
      
      -- 2. Vérifier policies
      SELECT COUNT(*) INTO v_policies_count
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = v_table_name;
      
      RAISE NOTICE '  Policies: %', v_policies_count;
      
      IF v_policies_count = 0 THEN
        RAISE WARNING '  ⚠️  Aucune policy RLS trouvée!';
        v_issues := array_append(v_issues, format('%s: Aucune policy RLS', v_table_name));
      ELSIF v_policies_count < 4 THEN
        RAISE WARNING '  ⚠️  Seulement % policies (attendu: 4)', v_policies_count;
        v_issues := array_append(v_issues, format('%s: Seulement %s policies (attendu: 4)', v_table_name, v_policies_count));
      ELSE
        RAISE NOTICE '  ✅ % policies trouvées', v_policies_count;
      END IF;
      
      -- Détail des policies
      DECLARE
        v_cmd TEXT;
        v_policy_count INTEGER;
      BEGIN
        FOR v_cmd IN SELECT DISTINCT cmd::TEXT FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table_name ORDER BY cmd
        LOOP
          SELECT COUNT(*) INTO v_policy_count
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = v_table_name
          AND cmd::TEXT = v_cmd;
          RAISE NOTICE '    - %: % policy(ies)', v_cmd, v_policy_count;
        END LOOP;
      END;
      
      -- 3. Vérifier company_id
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name 
        AND column_name = 'company_id'
      ) INTO v_has_company_id;
      
      IF v_has_company_id THEN
        SELECT is_nullable = 'YES' INTO v_company_id_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name 
        AND column_name = 'company_id';
        
        IF v_company_id_nullable THEN
          RAISE WARNING '  company_id: ⚠️  NULLABLE';
          v_issues := array_append(v_issues, format('%s: company_id est nullable', v_table_name));
        ELSE
          RAISE NOTICE '  company_id: ✅ NOT NULL';
        END IF;
        
        -- Compter données sans company_id
        EXECUTE format('SELECT COUNT(*)::INTEGER FROM public.%I WHERE company_id IS NULL', v_table_name) INTO v_null_data_count;
        
        IF v_null_data_count > 0 THEN
          RAISE WARNING '  ⚠️  % enregistrement(s) sans company_id', v_null_data_count;
          v_issues := array_append(v_issues, format('%s: %s enregistrement(s) sans company_id', v_table_name, v_null_data_count));
        ELSE
          RAISE NOTICE '  ✅ Aucun enregistrement sans company_id';
        END IF;
      ELSE
        RAISE WARNING '  company_id: ❌ MANQUANT';
        v_issues := array_append(v_issues, format('%s: company_id manquant', v_table_name));
      END IF;
      
      -- 4. Vérifier trigger
      SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgrelid = ('public.' || v_table_name)::regclass 
        AND tgname = 'force_company_id'
        AND tgenabled = 'O'
      ) INTO v_trigger_exists;
      
      IF v_trigger_exists THEN
        RAISE NOTICE '  Trigger force_company_id: ✅ ACTIF';
      ELSE
        RAISE WARNING '  Trigger force_company_id: ⚠️  MANQUANT OU INACTIF';
        IF v_has_company_id THEN
          v_issues := array_append(v_issues, format('%s: Trigger force_company_id manquant ou inactif', v_table_name));
        END IF;
      END IF;
      
      -- 5. Vérifier que les policies filtrent par company_id
      IF v_policies_count > 0 THEN
        DECLARE
          v_has_company_filter BOOLEAN;
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
          ) INTO v_has_company_filter;
          
          IF v_has_company_filter THEN
            RAISE NOTICE '  ✅ Policies filtrent par company_id';
          ELSE
            RAISE WARNING '  ⚠️  Aucune policy ne filtre par company_id!';
            v_issues := array_append(v_issues, format('%s: Policies ne filtrent pas par company_id', v_table_name));
          END IF;
        END;
      END IF;
      
      -- Résumé pour cette table
      IF v_rls_enabled 
        AND v_policies_count >= 4 
        AND v_has_company_id 
        AND NOT v_company_id_nullable 
        AND v_null_data_count = 0 THEN
        v_total_ok := v_total_ok + 1;
        RAISE NOTICE '  ✅ Table OK';
      ELSE
        v_total_ko := v_total_ko + 1;
        RAISE WARNING '  ❌ Table a des problèmes';
      END IF;
      
      RAISE NOTICE '';
    END IF;
  END LOOP;
  
  -- Résumé final
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables OK: % / %', v_total_ok, array_length(v_tables, 1);
  RAISE NOTICE 'Tables KO: % / %', v_total_ko, array_length(v_tables, 1);
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
  
  IF v_total_ko = 0 AND array_length(v_issues, 1) = 0 THEN
    RAISE NOTICE '✅ TOUTES LES TABLES SONT CORRECTEMENT CONFIGURÉES!';
  ELSE
    RAISE WARNING '⚠️  DES CORRECTIONS SONT NÉCESSAIRES';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Tableau récapitulatif visuel
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
