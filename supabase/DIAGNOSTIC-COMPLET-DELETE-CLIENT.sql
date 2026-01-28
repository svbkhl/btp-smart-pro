-- =====================================================
-- DIAGNOSTIC COMPLET : Problème de suppression client
-- =====================================================
-- Ce script teste tous les aspects de la suppression
-- pour identifier la cause exacte du problème
-- =====================================================

-- 1. Vérifier la structure de la table clients
SELECT 
  'Structure table clients' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes et index
SELECT 
  'Contraintes clients' as info,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.clients'::regclass
ORDER BY contype, conname;

-- 3. Vérifier si RLS est activé
SELECT 
  'RLS Status' as info,
  relname as table_name,
  relforcerowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'clients' 
  AND relnamespace = 'public'::regnamespace;

-- 4. Lister TOUTES les policies RLS (SELECT, INSERT, UPDATE, DELETE)
SELECT 
  'RLS Policies clients' as info,
  policyname,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
ORDER BY cmd, policyname;

-- 5. Vérifier la fonction current_company_id()
SELECT 
  'Fonction current_company_id' as info,
  proname,
  prorettype::regtype as return_type,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'current_company_id';

-- 6. Compter les clients par entreprise
SELECT 
  'Clients par entreprise' as info,
  company_id,
  COUNT(*) as nombre_clients,
  COUNT(DISTINCT id) as clients_uniques,
  STRING_AGG(DISTINCT id::TEXT, ', ' ORDER BY id::TEXT) FILTER (WHERE ROW_NUMBER() OVER (PARTITION BY id) = 1) as client_ids
FROM public.clients
GROUP BY company_id
ORDER BY nombre_clients DESC;

-- 7. Vérifier les doublons d'ID entre entreprises
SELECT 
  'Doublons ID clients' as info,
  id as client_id,
  COUNT(*) as nombre_occurrences,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids,
  STRING_AGG(DISTINCT name, ' | ') as names
FROM public.clients
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY nombre_occurrences DESC;

-- 8. Vérifier les clients sans company_id
SELECT 
  'Clients sans company_id' as info,
  id,
  name,
  company_id,
  created_at
FROM public.clients
WHERE company_id IS NULL
ORDER BY created_at DESC;

-- 9. Vérifier les utilisateurs et leurs entreprises
SELECT 
  'Utilisateurs par entreprise' as info,
  cu.company_id,
  cu.user_id,
  cu.status,
  u.email
FROM public.company_users cu
LEFT JOIN auth.users u ON u.id = cu.user_id
ORDER BY cu.company_id, cu.created_at;

-- 10. Vérifier les triggers sur clients
SELECT 
  'Triggers clients' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'clients'
ORDER BY trigger_name;

-- 11. Test : Compter les clients qu'un utilisateur peut voir (selon RLS)
-- NOTE: Ce test nécessite d'être exécuté avec un utilisateur authentifié
-- Pour tester, utilisez: SET LOCAL role TO authenticated;

-- 12. Vérifier les foreign keys
SELECT 
  'Foreign Keys clients' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'clients'
  AND tc.table_schema = 'public';
