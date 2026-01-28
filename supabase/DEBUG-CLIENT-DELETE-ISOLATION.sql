-- =====================================================
-- DIAGNOSTIC : Problème de suppression de clients
-- =====================================================
-- Ce script permet de vérifier pourquoi la suppression
-- d'un client dans une entreprise supprime aussi dans l'autre
-- =====================================================

-- 1. Vérifier les clients sans company_id
SELECT 
  COUNT(*) as clients_sans_company_id,
  COUNT(DISTINCT id) as ids_uniques
FROM public.clients
WHERE company_id IS NULL;

-- 2. Vérifier les clients avec company_id NULL ou vide
SELECT 
  id,
  name,
  company_id,
  user_id,
  created_at
FROM public.clients
WHERE company_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier si des clients partagent le même ID entre entreprises
SELECT 
  id,
  COUNT(DISTINCT company_id) as nb_entreprises,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids
FROM public.clients
GROUP BY id
HAVING COUNT(DISTINCT company_id) > 1;

-- 4. Compter les clients par entreprise
SELECT 
  company_id,
  COUNT(*) as nombre_clients
FROM public.clients
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY nombre_clients DESC;

-- 5. Vérifier les RLS policies DELETE sur clients
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
AND cmd = 'DELETE';

-- 6. Vérifier si RLS est activé sur clients
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'clients';

-- 7. Tester la fonction current_company_id() pour un utilisateur spécifique
-- Remplacez 'USER_ID_HERE' par un vrai user_id
-- SELECT 
--   auth.uid() as current_user_id,
--   public.current_company_id() as current_company_id;

-- 8. Vérifier les triggers sur la table clients
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'clients';
