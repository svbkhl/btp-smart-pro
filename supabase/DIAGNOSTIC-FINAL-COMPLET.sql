-- =====================================================
-- DIAGNOSTIC FINAL COMPLET
-- =====================================================
-- Ce script vérifie TOUT pour identifier le problème
-- =====================================================

-- 1. Vérifier tous les clients et leurs company_id
SELECT 
  'TOUS les clients' as info,
  id,
  name,
  company_id,
  user_id,
  created_at,
  CASE 
    WHEN company_id IS NULL THEN '❌ NULL - PROBLÈME!'
    ELSE '✅ ' || company_id::TEXT
  END as status
FROM public.clients
ORDER BY created_at DESC
LIMIT 20;

-- 2. Compter les clients par company_id
SELECT 
  'Clients par entreprise' as info,
  company_id,
  COUNT(*) as nombre_clients,
  STRING_AGG(name, ', ' ORDER BY created_at DESC) as noms_clients
FROM public.clients
GROUP BY company_id
ORDER BY nombre_clients DESC;

-- 3. Vérifier les clients avec company_id NULL
SELECT 
  'Clients avec company_id NULL (PROBLÈME!)' as info,
  COUNT(*) as total
FROM public.clients
WHERE company_id IS NULL;

-- 4. Vérifier le trigger force_company_id
SELECT 
  'Triggers sur clients' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'clients';

-- 5. Vérifier TOUTES les RLS policies
SELECT 
  'TOUTES les RLS policies' as info,
  policyname,
  cmd,
  permissive,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
ORDER BY cmd, policyname;

-- 6. Vérifier si RLS est activé
SELECT 
  'RLS Status' as info,
  relname,
  relforcerowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;

-- 7. Vérifier la fonction current_company_id
SELECT 
  'Fonction current_company_id' as info,
  proname,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'current_company_id';

-- 8. Vérifier si des utilisateurs sont membres de plusieurs entreprises
SELECT 
  'Utilisateurs membres de plusieurs entreprises' as info,
  user_id,
  COUNT(DISTINCT company_id) as nombre_entreprises,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids
FROM public.company_users
GROUP BY user_id
HAVING COUNT(DISTINCT company_id) > 1;

-- 9. Test : Simuler ce qu'un utilisateur verrait (nécessite authentification)
-- Note: Cette requête montre ce que RLS retournerait
SELECT 
  'Test visibilité (nécessite auth.uid())' as info,
  COUNT(*) as clients_visibles,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids_visibles
FROM public.clients
WHERE company_id = COALESCE(public.current_company_id(), '00000000-0000-0000-0000-000000000000'::UUID);
