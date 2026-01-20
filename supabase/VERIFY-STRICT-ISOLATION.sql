-- =====================================================
-- VÉRIFICATION ISOLATION STRICTE MULTI-TENANT
-- =====================================================
-- Ce script vérifie que l'isolation est correctement
-- implémentée pour toutes les tables métier
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'clients', 'projects', 'ai_quotes', 'invoices', 'payments',
    'employees', 'events', 'notifications', 'messages', 'ai_conversations',
    'ai_messages', 'candidatures', 'taches_rh',
    'rh_activities', 'employee_performances', 'maintenance_reminders',
    'image_analysis', 'employee_assignments'
  ];
  v_has_company_id BOOLEAN;
  v_is_not_null BOOLEAN;
  v_has_index BOOLEAN;
  v_has_rls BOOLEAN;
  v_has_policies BOOLEAN;
  v_has_trigger BOOLEAN;
  v_all_ok BOOLEAN := true;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION ISOLATION STRICTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      -- Vérifier company_id
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name
        AND column_name = 'company_id'
      ) INTO v_has_company_id;
      
      -- Vérifier NOT NULL
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name
        AND column_name = 'company_id'
        AND is_nullable = 'NO'
      ) INTO v_is_not_null;
      
      -- Vérifier index
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = v_table_name
        AND indexname LIKE '%company_id%'
      ) INTO v_has_index;
      
      -- Vérifier RLS activé
      SELECT rowsecurity 
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = v_table_name
      INTO v_has_rls;
      
      -- Vérifier policies
      SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = v_table_name
        AND policyname LIKE '%Strict company isolation%'
      ) INTO v_has_policies;
      
      -- Vérifier trigger
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = (v_table_name::regclass)::oid
        AND tgname LIKE 'force_company_id_%'
      ) INTO v_has_trigger;
      
      -- Afficher résultat
      IF v_has_company_id AND v_is_not_null AND v_has_index AND v_has_rls AND v_has_policies AND v_has_trigger THEN
        RAISE NOTICE '✅ % : OK', v_table_name;
      ELSE
        RAISE WARNING '❌ % :', v_table_name;
        IF NOT v_has_company_id THEN RAISE WARNING '   - company_id manquant'; v_all_ok := false; END IF;
        IF NOT v_is_not_null THEN RAISE WARNING '   - company_id nullable'; v_all_ok := false; END IF;
        IF NOT v_has_index THEN RAISE WARNING '   - Index company_id manquant'; v_all_ok := false; END IF;
        IF NOT v_has_rls THEN RAISE WARNING '   - RLS non activé'; v_all_ok := false; END IF;
        IF NOT v_has_policies THEN RAISE WARNING '   - Policies manquantes'; v_all_ok := false; END IF;
        IF NOT v_has_trigger THEN RAISE WARNING '   - Trigger force_company_id manquant'; v_all_ok := false; END IF;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  IF v_all_ok THEN
    RAISE NOTICE '✅ Toutes les tables sont correctement configurées !';
  ELSE
    RAISE WARNING '⚠️ Certaines tables nécessitent des corrections';
  END IF;
  RAISE NOTICE '';
END $$;

-- Vérifier qu'il n'y a pas de company_id NULL
SELECT 
  'company_id NULL dans clients' as check_name,
  COUNT(*) as null_count
FROM public.clients
WHERE company_id IS NULL
UNION ALL
SELECT 
  'company_id NULL dans projects',
  COUNT(*)
FROM public.projects
WHERE company_id IS NULL
UNION ALL
SELECT 
  'company_id NULL dans invoices',
  COUNT(*)
FROM public.invoices
WHERE company_id IS NULL
UNION ALL
SELECT 
  'company_id NULL dans messages',
  COUNT(*)
FROM public.messages
WHERE company_id IS NULL;

-- Vérifier la fonction current_company_id
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'current_company_id'
    ) THEN '✅ current_company_id() existe'
    ELSE '❌ current_company_id() manquante'
  END AS function_check;
