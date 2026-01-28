-- =====================================================
-- TEST : Vérification de l'isolation DELETE pour clients
-- =====================================================
-- Ce script teste que la suppression d'un client dans une entreprise
-- n'affecte pas les clients d'autres entreprises
-- =====================================================

-- 1. Vérifier que tous les clients ont un company_id
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE company_id IS NULL) = 0 THEN '✅ Tous les clients ont un company_id'
    ELSE '❌ Il y a ' || COUNT(*) FILTER (WHERE company_id IS NULL) || ' client(s) sans company_id'
  END as verification_company_id
FROM public.clients;

-- 2. Vérifier qu'il n'y a pas de clients partageant le même ID entre entreprises
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Aucun client ne partage d''ID entre entreprises'
    ELSE '❌ Il y a ' || COUNT(*) || ' client(s) avec le même ID dans plusieurs entreprises'
  END as verification_ids_uniques
FROM (
  SELECT id
  FROM public.clients
  GROUP BY id
  HAVING COUNT(DISTINCT company_id) > 1
) duplicates;

-- 3. Vérifier que la policy DELETE existe et est correcte
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%company_id%' AND qual LIKE '%current_company_id%' THEN '✅ Policy DELETE correcte'
    ELSE '⚠️ Policy DELETE peut être améliorée'
  END as verification_policy
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
AND cmd = 'DELETE';

-- 4. Vérifier que RLS est activé
SELECT 
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS est activé sur la table clients'
    ELSE '❌ RLS n''est PAS activé sur la table clients'
  END as verification_rls
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'clients';

-- 5. Compter les clients par entreprise
SELECT 
  company_id,
  COUNT(*) as nombre_clients
FROM public.clients
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY nombre_clients DESC;

-- 6. Vérifier la fonction current_company_id()
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'current_company_id'
    ) THEN '✅ La fonction current_company_id() existe'
    ELSE '❌ La fonction current_company_id() n''existe pas'
  END as verification_function;
