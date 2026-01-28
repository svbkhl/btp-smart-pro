-- =====================================================
-- VÉRIFICATION : État actuel de l'isolation clients
-- =====================================================
-- Ce script vérifie l'état actuel pour identifier
-- pourquoi les clients apparaissent dans toutes les entreprises
-- =====================================================

-- 1. Vérifier si le trigger force_company_id existe et est actif
SELECT 
  'Triggers sur clients' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'clients'
ORDER BY trigger_name;

-- 2. Vérifier les RLS policies SELECT actives
SELECT 
  'RLS Policies SELECT' as info,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT';

-- 3. Vérifier si RLS est activé
SELECT 
  'RLS Status' as info,
  relname,
  relforcerowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;

-- 4. Vérifier les clients récents et leurs company_id
SELECT 
  '10 derniers clients créés' as info,
  id,
  name,
  company_id,
  user_id,
  created_at,
  CASE 
    WHEN company_id IS NULL THEN '❌ NULL'
    ELSE '✅ ' || company_id::TEXT
  END as company_id_status
FROM public.clients
ORDER BY created_at DESC
LIMIT 10;

-- 5. Compter les clients par entreprise
SELECT 
  'Clients par entreprise' as info,
  company_id,
  COUNT(*) as nombre_clients
FROM public.clients
GROUP BY company_id
ORDER BY nombre_clients DESC;

-- 6. Vérifier si des clients ont un company_id NULL
SELECT 
  'Clients sans company_id' as info,
  COUNT(*) as total_sans_company_id
FROM public.clients
WHERE company_id IS NULL;

-- 7. Vérifier la fonction current_company_id
SELECT 
  'Fonction current_company_id' as info,
  proname,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'current_company_id';

-- 8. Tester ce qu'un utilisateur voit (nécessite un utilisateur authentifié)
-- Cette requête simule ce qu'un utilisateur authentifié verrait
-- Note: Pour un vrai test, exécutez en tant qu'utilisateur authentifié
SELECT 
  'Test visibilité (simulation)' as info,
  COUNT(*) as clients_visibles,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids_visibles
FROM public.clients
WHERE company_id = public.current_company_id()
  OR public.current_company_id() IS NULL; -- Si NULL, peut voir tous (problème!)
