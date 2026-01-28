-- ============================================
-- SCRIPT DE VÉRIFICATION COMPLÈTE DE L'ISOLATION MULTI-TENANT
-- ============================================
-- Ce script vérifie que tous les mécanismes d'isolation sont en place
-- pour la table clients
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard > SQL Editor
-- 2. Copiez TOUT le contenu de ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez sur "Run"
-- 5. Vérifiez les résultats dans les messages NOTICE et WARNING
-- ============================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
  trigger_exists BOOLEAN;
  function_force_exists BOOLEAN;
  function_current_exists BOOLEAN;
  null_clients_count INTEGER;
  duplicate_clients_count INTEGER;
  policies_count INTEGER;
  v_policy_name TEXT;
  v_cmd TEXT;
  v_qual TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION COMPLÈTE DE L''ISOLATION MULTI-TENANT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ============================================
  -- 1. VÉRIFIER QUE RLS EST ACTIVÉ
  -- ============================================
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' AND tablename = 'clients';
  
  RAISE NOTICE '1. RLS Status:';
  IF rls_enabled THEN
    RAISE NOTICE '   ✅ RLS est ACTIVÉ sur la table clients';
  ELSE
    RAISE WARNING '   ⚠️ RLS N''EST PAS ACTIVÉ sur la table clients!';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 2. LISTER TOUTES LES POLICIES RLS ACTIVES
  -- ============================================
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'clients';
  
  RAISE NOTICE '2. RLS Policies:';
  RAISE NOTICE '   Nombre total de policies: %', policies_count;
  
  IF policies_count > 0 THEN
    RAISE NOTICE '   Détails des policies:';
    FOR v_policy_name, v_cmd, v_qual IN
      SELECT policyname, cmd::text, COALESCE(qual::text, 'N/A')
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'clients'
      ORDER BY cmd, policyname
    LOOP
      RAISE NOTICE '   - % (%): %', v_policy_name, v_cmd, LEFT(v_qual, 100);
    END LOOP;
  ELSE
    RAISE WARNING '   ⚠️ Aucune policy RLS trouvée!';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 3. VÉRIFIER QUE LE TRIGGER force_company_id EXISTE ET EST ACTIF
  -- ============================================
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = 'public.clients'::regclass 
    AND tgname = 'force_company_id'
    AND tgenabled = 'O'
  ) INTO trigger_exists;
  
  RAISE NOTICE '3. Trigger force_company_id:';
  IF trigger_exists THEN
    RAISE NOTICE '   ✅ Le trigger force_company_id existe et est ACTIVÉ';
  ELSE
    RAISE WARNING '   ⚠️ Le trigger force_company_id n''existe pas ou est DÉSACTIVÉ!';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 4. VÉRIFIER LA FONCTION force_company_id
  -- ============================================
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'force_company_id'
    AND pronamespace = 'public'::regnamespace
  ) INTO function_force_exists;
  
  RAISE NOTICE '4. Fonction force_company_id:';
  IF function_force_exists THEN
    RAISE NOTICE '   ✅ La fonction force_company_id existe';
  ELSE
    RAISE WARNING '   ⚠️ La fonction force_company_id n''existe pas!';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 5. VÉRIFIER LES CLIENTS SANS company_id (PROBLÈME CRITIQUE)
  -- ============================================
  SELECT COUNT(*) INTO null_clients_count
  FROM public.clients
  WHERE company_id IS NULL;
  
  RAISE NOTICE '5. Clients sans company_id:';
  IF null_clients_count = 0 THEN
    RAISE NOTICE '   ✅ Aucun client sans company_id trouvé';
  ELSE
    RAISE WARNING '   ⚠️ % client(s) sans company_id trouvé(s)!', null_clients_count;
    RAISE NOTICE '   Liste des clients concernés:';
    FOR v_policy_name IN
      SELECT '   - ID: ' || id || ', Nom: ' || COALESCE(name, 'N/A') || ', User: ' || user_id
      FROM public.clients
      WHERE company_id IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    LOOP
      RAISE NOTICE '%', v_policy_name;
    END LOOP;
    IF null_clients_count > 10 THEN
      RAISE NOTICE '   ... et % autres', null_clients_count - 10;
    END IF;
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 6. VÉRIFIER LES CLIENTS AVEC MÊME ID DANS DIFFÉRENTES ENTREPRISES
  -- ============================================
  SELECT COUNT(*) INTO duplicate_clients_count
  FROM (
    SELECT id
    FROM public.clients
    GROUP BY id
    HAVING COUNT(DISTINCT company_id) > 1
  ) duplicates;
  
  RAISE NOTICE '6. Clients avec ID dupliqué (même ID dans différentes entreprises):';
  IF duplicate_clients_count = 0 THEN
    RAISE NOTICE '   ✅ Aucun client avec ID dupliqué trouvé';
  ELSE
    RAISE WARNING '   ⚠️ % client(s) avec ID dupliqué trouvé(s)!', duplicate_clients_count;
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 7. COMPTER LES CLIENTS PAR ENTREPRISE
  -- ============================================
  RAISE NOTICE '7. Répartition des clients par entreprise:';
  FOR v_policy_name, v_cmd IN
    SELECT company_id::text, COUNT(*)::text
    FROM public.clients
    WHERE company_id IS NOT NULL
    GROUP BY company_id
    ORDER BY COUNT(*) DESC
  LOOP
    RAISE NOTICE '   - Entreprise %: % client(s)', v_policy_name, v_cmd;
  END LOOP;
  RAISE NOTICE '';
  
  -- ============================================
  -- 8. VÉRIFIER QUE LA FONCTION current_company_id() EXISTE
  -- ============================================
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'current_company_id'
    AND pronamespace = 'public'::regnamespace
  ) INTO function_current_exists;
  
  RAISE NOTICE '8. Fonction current_company_id:';
  IF function_current_exists THEN
    RAISE NOTICE '   ✅ La fonction current_company_id existe';
  ELSE
    RAISE WARNING '   ⚠️ La fonction current_company_id n''existe pas!';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 9. RÉSUMÉ FINAL
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS activé: %', CASE WHEN rls_enabled THEN '✅ OUI' ELSE '❌ NON' END;
  RAISE NOTICE 'Policies RLS: %', policies_count;
  RAISE NOTICE 'Trigger force_company_id: %', CASE WHEN trigger_exists THEN '✅ OUI' ELSE '❌ NON' END;
  RAISE NOTICE 'Fonction force_company_id: %', CASE WHEN function_force_exists THEN '✅ OUI' ELSE '❌ NON' END;
  RAISE NOTICE 'Fonction current_company_id: %', CASE WHEN function_current_exists THEN '✅ OUI' ELSE '❌ NON' END;
  RAISE NOTICE 'Clients sans company_id: %', null_clients_count;
  RAISE NOTICE 'Clients avec ID dupliqué: %', duplicate_clients_count;
  RAISE NOTICE '';
  
  IF rls_enabled 
    AND trigger_exists 
    AND function_force_exists 
    AND function_current_exists 
    AND null_clients_count = 0 
    AND duplicate_clients_count = 0 
    AND policies_count >= 4 THEN
    RAISE NOTICE '✅ TOUTES LES VÉRIFICATIONS SONT PASSÉES!';
    RAISE NOTICE '✅ L''isolation multi-tenant est correctement configurée.';
  ELSE
    RAISE WARNING '⚠️ CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ!';
    RAISE WARNING '⚠️ Veuillez corriger les problèmes identifiés ci-dessus.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Requête pour afficher les policies dans un format lisible (optionnel)
SELECT 
  policyname as "Nom de la Policy",
  cmd as "Commande",
  CASE 
    WHEN cmd = 'SELECT' THEN 'Lecture'
    WHEN cmd = 'INSERT' THEN 'Création'
    WHEN cmd = 'UPDATE' THEN 'Modification'
    WHEN cmd = 'DELETE' THEN 'Suppression'
    ELSE cmd::text
  END as "Type",
  LEFT(COALESCE(qual::text, ''), 200) as "Condition USING"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'clients'
ORDER BY cmd, policyname;
