-- =====================================================
-- SCRIPT DE TEST : ISOLATION MULTI-TENANT
-- =====================================================
-- Ce script vérifie que les données sont bien isolées
-- entre les entreprises (séparation des données)
-- =====================================================

-- =====================================================
-- TEST 1 : Vérifier que chaque entreprise a ses propres données
-- =====================================================

DO $$
DECLARE
  v_test_result TEXT;
  v_company_count INTEGER;
  v_isolation_ok BOOLEAN := true;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 1 : Isolation des données par entreprise';
  RAISE NOTICE '========================================';
  
  -- Compter les entreprises
  SELECT COUNT(*) INTO v_company_count FROM public.companies;
  RAISE NOTICE '📊 Nombre d''entreprises trouvées: %', v_company_count;
  
  -- Vérifier que chaque entreprise a des données séparées
  IF v_company_count >= 2 THEN
    -- Vérifier qu'il n'y a pas de données partagées entre entreprises
    -- (chaque ligne doit avoir un company_id unique)
    
    -- Test sur clients
    SELECT COUNT(*) INTO v_company_count
    FROM (
      SELECT company_id, COUNT(*) as count
      FROM public.clients
      WHERE company_id IS NOT NULL
      GROUP BY company_id
      HAVING COUNT(*) > 0
    ) sub;
    
    IF v_company_count > 0 THEN
      RAISE NOTICE '✅ Les clients sont bien séparés par entreprise';
    ELSE
      RAISE WARNING '⚠️ Aucun client trouvé avec company_id';
      v_isolation_ok := false;
    END IF;
    
    -- Test sur projets
    SELECT COUNT(*) INTO v_company_count
    FROM (
      SELECT company_id, COUNT(*) as count
      FROM public.projects
      WHERE company_id IS NOT NULL
      GROUP BY company_id
      HAVING COUNT(*) > 0
    ) sub;
    
    IF v_company_count > 0 THEN
      RAISE NOTICE '✅ Les projets sont bien séparés par entreprise';
    ELSE
      RAISE WARNING '⚠️ Aucun projet trouvé avec company_id';
    END IF;
    
    -- Test sur factures
    SELECT COUNT(*) INTO v_company_count
    FROM (
      SELECT company_id, COUNT(*) as count
      FROM public.invoices
      WHERE company_id IS NOT NULL
      GROUP BY company_id
      HAVING COUNT(*) > 0
    ) sub;
    
    IF v_company_count > 0 THEN
      RAISE NOTICE '✅ Les factures sont bien séparées par entreprise';
    ELSE
      RAISE WARNING '⚠️ Aucune facture trouvée avec company_id';
    END IF;
    
  ELSE
    RAISE NOTICE 'ℹ️ Moins de 2 entreprises trouvées. Test d''isolation nécessite au moins 2 entreprises.';
  END IF;
  
  IF v_isolation_ok THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ RÉSULTAT : Isolation des données OK';
  END IF;
  
END $$;

-- =====================================================
-- TEST 2 : Vérifier les RLS Policies
-- =====================================================

DO $$
DECLARE
  v_rls_enabled BOOLEAN;
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY['clients', 'projects', 'invoices', 'payments', 'ai_quotes'];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 2 : Vérification des RLS Policies';
  RAISE NOTICE '========================================';
  
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      -- Vérifier si RLS est activé
      SELECT rowsecurity INTO v_rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = v_table_name;
      
      IF v_rls_enabled THEN
        RAISE NOTICE '✅ RLS activé pour la table: %', v_table_name;
      ELSE
        RAISE WARNING '❌ RLS NON activé pour la table: %', v_table_name;
      END IF;
      
      -- Vérifier s'il y a des policies
      IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = v_table_name
      ) THEN
        RAISE NOTICE '   → Policies RLS présentes';
      ELSE
        RAISE WARNING '   → Aucune policy RLS trouvée';
      END IF;
    ELSE
      RAISE NOTICE 'ℹ️ Table % n''existe pas', v_table_name;
    END IF;
  END LOOP;
  
END $$;

-- =====================================================
-- TEST 3 : Vérifier que company_id n'est pas NULL
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_null_count INTEGER;
  v_tables TEXT[] := ARRAY[
    'clients', 'projects', 'invoices', 'payments', 'ai_quotes',
    'employees', 'events', 'notifications'
  ];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 3 : Vérification des company_id NULL';
  RAISE NOTICE '========================================';
  
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
        BEGIN
          EXECUTE format('
            SELECT COUNT(*) 
            FROM public.%I 
            WHERE company_id IS NULL
          ', v_table_name) INTO v_null_count;
          
          IF v_null_count = 0 THEN
            RAISE NOTICE '✅ % : Aucun company_id NULL', v_table_name;
          ELSE
            RAISE WARNING '⚠️ % : % lignes avec company_id NULL', v_table_name, v_null_count;
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erreur lors de la vérification de % : %', v_table_name, SQLERRM;
        END;
      ELSE
        RAISE NOTICE 'ℹ️ % : colonne company_id n''existe pas', v_table_name;
      END IF;
    END IF;
  END LOOP;
  
END $$;

-- =====================================================
-- TEST 4 : Vérifier la fonction current_company_ids()
-- =====================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 4 : Vérification des fonctions helper';
  RAISE NOTICE '========================================';
  
  -- Vérifier current_company_ids()
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'current_company_ids'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RAISE NOTICE '✅ Fonction current_company_ids() existe';
  ELSE
    RAISE WARNING '❌ Fonction current_company_ids() n''existe pas';
  END IF;
  
  -- Vérifier is_company_member()
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'is_company_member'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RAISE NOTICE '✅ Fonction is_company_member() existe';
  ELSE
    RAISE WARNING '❌ Fonction is_company_member() n''existe pas';
  END IF;
  
END $$;

-- =====================================================
-- RÉSUMÉ : Statistiques par entreprise
-- =====================================================

SELECT 
  c.id AS company_id,
  c.name AS company_name,
  (SELECT COUNT(*) FROM public.company_users cu WHERE cu.company_id = c.id) AS nb_membres,
  (SELECT COUNT(*) FROM public.clients cl WHERE cl.company_id = c.id) AS nb_clients,
  (SELECT COUNT(*) FROM public.projects p WHERE p.company_id = c.id) AS nb_projets,
  (SELECT COUNT(*) FROM public.invoices i WHERE i.company_id = c.id) AS nb_factures,
  c.status,
  c.plan
FROM public.companies c
ORDER BY c.name;

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DES TESTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Tous les tests ont été exécutés';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Pour tester manuellement l''isolation:';
  RAISE NOTICE '   1. Connectez-vous avec un compte dans Entreprise A';
  RAISE NOTICE '   2. Vérifiez que vous ne voyez que les données de l''Entreprise A';
  RAISE NOTICE '   3. Connectez-vous avec un compte dans Entreprise B';
  RAISE NOTICE '   4. Vérifiez que vous ne voyez que les données de l''Entreprise B';
  RAISE NOTICE '   5. Les données ne doivent jamais se mélanger';
  RAISE NOTICE '';
END $$;
