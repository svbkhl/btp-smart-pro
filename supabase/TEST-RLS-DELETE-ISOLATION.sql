-- =====================================================
-- TEST : Isolation RLS lors de la suppression
-- =====================================================
-- Ce script teste que les RLS policies empêchent
-- la suppression de clients d'autres entreprises
-- =====================================================

-- IMPORTANT: Pour tester correctement, vous devez :
-- 1. Exécuter ce script en tant qu'utilisateur A (entreprise 1)
-- 2. Noter un client ID de l'entreprise 1
-- 3. Exécuter ensuite en tant qu'utilisateur B (entreprise 2)
-- 4. Essayer de supprimer le client de l'entreprise 1

-- Remplacez par un ID réel d'un client
\set test_client_id 'CLIENT_ID_A_TESTER'

-- 1. Afficher le company_id actuel selon current_company_id()
SELECT 
  '=== TEST RLS DELETE ISOLATION ===' as test_section,
  'Company ID actuel' as info,
  auth.uid() as current_user_id,
  public.current_company_id() as current_company_id;

-- 2. Afficher TOUS les clients avec cet ID (sans filtre RLS, avec service role)
-- Note: Cette requête nécessite des privilèges élevés
-- En production, seuls les admins peuvent voir tous les clients
SELECT 
  'Tous les clients avec cet ID (toutes entreprises)' as info,
  id,
  name,
  company_id,
  created_at
FROM public.clients
WHERE id = :'test_client_id';

-- 3. Vérifier quel client l'utilisateur ACTUEL peut voir (avec RLS)
-- C'est ce que l'utilisateur verrait normalement
SELECT 
  'Clients visibles pour l''utilisateur actuel (avec RLS)' as info,
  id,
  name,
  company_id
FROM public.clients
WHERE id = :'test_client_id';

-- 4. Tester la condition RLS DELETE manuellement
SELECT 
  'Test condition RLS DELETE' as info,
  id,
  name,
  company_id,
  -- Condition 1: company_id IS NOT NULL
  company_id IS NOT NULL as condition_1_has_company_id,
  -- Condition 2: company_id = current_company_id()
  company_id = public.current_company_id() as condition_2_matches_current,
  -- Condition 3: User is member
  EXISTS (
    SELECT 1 
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = clients.company_id
  ) as condition_3_user_is_member,
  -- Toutes les conditions
  (
    company_id IS NOT NULL
    AND company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = clients.company_id
    )
  ) as can_delete
FROM public.clients
WHERE id = :'test_client_id';

-- 5. Si can_delete = false, la suppression devrait échouer
-- Si can_delete = true, la suppression devrait réussir

-- 6. Vérifier les policies RLS DELETE actives
SELECT 
  'RLS Policies DELETE pour clients' as info,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'DELETE';

-- 7. Vérifier si RLS est activé
SELECT 
  'RLS Status' as info,
  relname,
  relforcerowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;
