-- ============================================
-- ACTIVATION URGENTE RLS SUR TOUTES LES TABLES MÉTIER
-- ============================================
-- PROBLÈME CRITIQUE DÉTECTÉ : RLS désactivé sur toutes les tables métier
-- Ce script active RLS et crée les policies strictes pour toutes les tables
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard > SQL Editor
-- 2. Copiez TOUT le contenu de ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez sur "Run"
-- 5. Vérifiez que RLS est maintenant activé (✅)
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
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ACTIVATION RLS URGENTE';
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
      -- Activer RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
      RAISE NOTICE '✅ RLS activé sur: %', v_table_name;
      
      -- Supprimer toutes les anciennes policies (pour repartir proprement)
      DECLARE
        v_policy_name TEXT;
      BEGIN
        FOR v_policy_name IN
          SELECT policyname 
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = v_table_name
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I CASCADE', v_policy_name, v_table_name);
        END LOOP;
      END;
      
      -- Vérifier si company_id existe
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name 
        AND column_name = 'company_id'
      ) THEN
        -- Créer les policies strictes basées sur company_id
        
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
              AND EXISTS (
                SELECT 1 
                FROM public.company_users cu
                WHERE cu.user_id = auth.uid()
                AND cu.company_id = %I.company_id
              )
            )', v_table_name || '_select', v_table_name, v_table_name);
          RAISE NOTICE '  ✅ Policy SELECT créée pour: %', v_table_name;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️ Erreur création SELECT policy pour %: %', v_table_name, SQLERRM;
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
              AND EXISTS (
                SELECT 1 
                FROM public.company_users cu
                WHERE cu.user_id = auth.uid()
                AND cu.company_id = public.current_company_id()
              )
            )', v_table_name || '_insert', v_table_name);
          RAISE NOTICE '  ✅ Policy INSERT créée pour: %', v_table_name;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️ Erreur création INSERT policy pour %: %', v_table_name, SQLERRM;
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
              AND EXISTS (
                SELECT 1 
                FROM public.company_users cu
                WHERE cu.user_id = auth.uid()
                AND cu.company_id = %I.company_id
              )
            )
            WITH CHECK (
              company_id IS NOT NULL
              AND public.current_company_id() IS NOT NULL
              AND company_id = public.current_company_id()
            )', v_table_name || '_update', v_table_name, v_table_name);
          RAISE NOTICE '  ✅ Policy UPDATE créée pour: %', v_table_name;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️ Erreur création UPDATE policy pour %: %', v_table_name, SQLERRM;
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
              AND EXISTS (
                SELECT 1 
                FROM public.company_users cu
                WHERE cu.user_id = auth.uid()
                AND cu.company_id = %I.company_id
              )
            )', v_table_name || '_delete', v_table_name, v_table_name);
          RAISE NOTICE '  ✅ Policy DELETE créée pour: %', v_table_name;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '  ⚠️ Erreur création DELETE policy pour %: %', v_table_name, SQLERRM;
        END;
        
      ELSE
        RAISE WARNING '  ⚠️ Table % n''a pas de colonne company_id - policies non créées', v_table_name;
      END IF;
      
      RAISE NOTICE '';
    ELSE
      RAISE NOTICE 'ℹ️  Table % n''existe pas - ignorée', v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ACTIVATION RLS TERMINÉE';
  RAISE NOTICE '========================================';
END $$;

-- Vérification finale : Afficher le statut RLS de toutes les tables
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
  ) as "Policies"
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
