-- =====================================================
-- TEST : Vérifier quels clients sont visibles
-- =====================================================
-- Ce script teste ce qu'un utilisateur peut voir
-- selon les RLS policies
-- =====================================================

-- IMPORTANT: Exécutez ce script en tant qu'utilisateur authentifié
-- pour voir ce que les RLS policies permettent

-- 1. Vérifier le company_id actuel
SELECT 
  '=== TEST VISIBILITÉ CLIENTS ===' as test_section,
  auth.uid() as current_user_id,
  public.current_company_id() as current_company_id;

-- 2. Vérifier toutes les entreprises de l'utilisateur
SELECT 
  'Entreprises de l''utilisateur' as info,
  cu.company_id,
  cu.status,
  cu.created_at,
  comp.name as company_name
FROM public.company_users cu
LEFT JOIN public.companies comp ON comp.id = cu.company_id
WHERE cu.user_id = auth.uid()
ORDER BY cu.created_at;

-- 3. Compter TOUS les clients dans la base (sans RLS - nécessite privilèges élevés)
-- Cette requête montre tous les clients, mais un utilisateur normal ne devrait voir que ceux de son entreprise
SELECT 
  'TOUS les clients (toutes entreprises) - VUE ADMIN' as info,
  COUNT(*) as total_clients,
  COUNT(DISTINCT company_id) as nombre_entreprises,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids
FROM public.clients;

-- 4. Compter les clients visibles pour l'utilisateur ACTUEL (avec RLS)
-- C'est ce que l'utilisateur devrait voir normalement
SELECT 
  'Clients visibles pour l''utilisateur actuel (avec RLS)' as info,
  COUNT(*) as clients_visibles,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids_visibles
FROM public.clients;

-- 5. Lister les clients visibles pour l'utilisateur ACTUEL (avec RLS)
SELECT 
  'Liste des clients visibles (avec RLS)' as info,
  id,
  name,
  company_id,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 20;

-- 6. Vérifier si des clients ont un company_id différent de current_company_id()
SELECT 
  'Clients avec company_id différent de current_company_id()' as info,
  id,
  name,
  company_id,
  public.current_company_id() as current_company_id,
  CASE 
    WHEN company_id = public.current_company_id() THEN '✅ OK'
    ELSE '❌ PROBLÈME - visible mais appartient à une autre entreprise'
  END as status
FROM public.clients
WHERE company_id != public.current_company_id()
ORDER BY created_at DESC;

-- 7. Vérifier les RLS policies SELECT actives
SELECT 
  'RLS Policies SELECT pour clients' as info,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT'
ORDER BY policyname;
