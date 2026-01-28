-- =====================================================
-- TEST MANUEL : Isolation DELETE
-- =====================================================
-- Ce script permet de tester manuellement l'isolation
-- en tentant de supprimer un client d'une autre entreprise
-- =====================================================

-- REMPLACEZ ces valeurs par de vraies valeurs de test :
-- :test_client_id = UUID d'un client existant
-- :test_company_id = UUID d'une entreprise DIFFÉRENTE de celle du client

-- 1. Identifier un client de test et son entreprise
SELECT 
  'Client de test' as info,
  id as client_id,
  name,
  company_id as client_company_id,
  (SELECT name FROM public.companies WHERE id = clients.company_id) as company_name
FROM public.clients
LIMIT 1;

-- 2. Tester la fonction current_company_id() pour voir ce qu'elle retourne
-- (Exécutez ceci avec un utilisateur connecté dans Supabase Dashboard)
SELECT 
  'Test current_company_id()' as info,
  auth.uid() as current_user_id,
  public.current_company_id() as returned_company_id;

-- 3. Vérifier si on peut voir un client d'une autre entreprise
-- (Cela devrait retourner 0 lignes si RLS fonctionne correctement)
SELECT 
  'Clients visibles (devrait être filtrés par RLS)' as info,
  id,
  name,
  company_id
FROM public.clients;

-- 4. Vérifier les policies SELECT pour voir ce qui est visible
SELECT 
  'Policy SELECT active' as info,
  policyname,
  qual as condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
AND cmd = 'SELECT';

-- 5. Test de suppression (simulation - ne sera pas exécuté sans modification)
-- DO $$
-- DECLARE
--   v_test_client_id UUID := 'REMPLACEZ_PAR_UUID_CLIENT';
--   v_test_company_id UUID := 'REMPLACEZ_PAR_UUID_AUTRE_ENTREPRISE';
--   v_deleted_count INTEGER;
-- BEGIN
--   -- Tenter de supprimer un client avec un mauvais company_id
--   DELETE FROM public.clients
--   WHERE id = v_test_client_id
--   AND company_id = v_test_company_id;
--   
--   GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
--   
--   IF v_deleted_count > 0 THEN
--     RAISE WARNING '❌ PROBLÈME: Client supprimé avec mauvais company_id!';
--   ELSE
--     RAISE NOTICE '✅ OK: Client non supprimé avec mauvais company_id';
--   END IF;
-- END $$;
