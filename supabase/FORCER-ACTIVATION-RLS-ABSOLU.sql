-- ============================================
-- FORCER L'ACTIVATION RLS - SOLUTION ABSOLUE
-- ============================================
-- PROBLÈME : RLS montre ❌ malgré l'exécution du script
-- Ce script force l'activation RLS de manière absolue
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
  v_rls_enabled BOOLEAN;
  v_success_count INTEGER := 0;
  v_fail_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FORCER ACTIVATION RLS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      -- Vérifier l'état actuel
      SELECT relforcerowsecurity INTO v_rls_enabled
      FROM pg_class 
      WHERE relname = v_table_name 
      AND relnamespace = 'public'::regnamespace;
      
      IF v_rls_enabled THEN
        RAISE NOTICE '✅ % - RLS déjà activé', v_table_name;
        v_success_count := v_success_count + 1;
      ELSE
        -- Forcer l'activation RLS
        BEGIN
          EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
          
          -- Vérifier que c'est bien activé
          SELECT relforcerowsecurity INTO v_rls_enabled
          FROM pg_class 
          WHERE relname = v_table_name 
          AND relnamespace = 'public'::regnamespace;
          
          IF v_rls_enabled THEN
            RAISE NOTICE '✅ % - RLS activé avec succès', v_table_name;
            v_success_count := v_success_count + 1;
          ELSE
            RAISE WARNING '❌ % - RLS n''a pas pu être activé', v_table_name;
            v_fail_count := v_fail_count + 1;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ % - Erreur lors de l''activation RLS: %', v_table_name, SQLERRM;
          v_fail_count := v_fail_count + 1;
        END;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables avec RLS activé: %', v_success_count;
  RAISE NOTICE 'Tables avec RLS échoué: %', v_fail_count;
  RAISE NOTICE '';
  
  IF v_fail_count = 0 THEN
    RAISE NOTICE '✅ TOUTES LES TABLES ONT RLS ACTIVÉ';
  ELSE
    RAISE WARNING '⚠️  % TABLE(S) N''ONT PAS RLS ACTIVÉ', v_fail_count;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Vérification finale avec requête directe
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
