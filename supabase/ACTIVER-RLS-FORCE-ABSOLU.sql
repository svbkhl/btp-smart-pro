-- ============================================
-- ACTIVATION FORCÉE RLS - SOLUTION ABSOLUE
-- ============================================
-- Force l'activation RLS sur toutes les tables métier
-- et vérifie que c'est bien activé
-- ============================================

-- Méthode 1 : Activation directe table par table
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.image_analysis ENABLE ROW LEVEL SECURITY;

-- Vérification avec diagnostic détaillé
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
  v_relforcerowsecurity BOOLEAN;
  v_relrowsecurity BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION RLS APRÈS ACTIVATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      -- Vérifier relforcerowsecurity (RLS forcé)
      SELECT 
        relforcerowsecurity,
        relrowsecurity
      INTO 
        v_relforcerowsecurity,
        v_relrowsecurity
      FROM pg_class 
      WHERE relname = v_table_name 
      AND relnamespace = 'public'::regnamespace;
      
      v_rls_enabled := COALESCE(v_relforcerowsecurity, false) OR COALESCE(v_relrowsecurity, false);
      
      RAISE NOTICE 'Table: %', v_table_name;
      RAISE NOTICE '  relforcerowsecurity: %', v_relforcerowsecurity;
      RAISE NOTICE '  relrowsecurity: %', v_relrowsecurity;
      RAISE NOTICE '  RLS activé: %', CASE WHEN v_rls_enabled THEN '✅ OUI' ELSE '❌ NON' END;
      RAISE NOTICE '';
      
      -- Si toujours pas activé, essayer une autre méthode
      IF NOT v_rls_enabled THEN
        BEGIN
          -- Essayer avec FORCE
          EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table_name);
          RAISE NOTICE '  ⚠️  Tentative avec FORCE ROW LEVEL SECURITY...';
          
          -- Re-vérifier
          SELECT 
            relforcerowsecurity,
            relrowsecurity
          INTO 
            v_relforcerowsecurity,
            v_relrowsecurity
          FROM pg_class 
          WHERE relname = v_table_name 
          AND relnamespace = 'public'::regnamespace;
          
          v_rls_enabled := COALESCE(v_relforcerowsecurity, false) OR COALESCE(v_relrowsecurity, false);
          
          IF v_rls_enabled THEN
            RAISE NOTICE '  ✅ RLS activé avec FORCE';
          ELSE
            RAISE WARNING '  ❌ RLS toujours pas activé après FORCE';
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️  Erreur avec FORCE: %', SQLERRM;
        END;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- Vérification finale avec la bonne colonne
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
    WHEN COALESCE(c.relforcerowsecurity, false) OR COALESCE(c.relrowsecurity, false) THEN '✅'
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
