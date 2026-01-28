-- =====================================================
-- TEST DIRECT : Pourquoi RLS échoue
-- =====================================================
-- Ce script teste directement pourquoi RLS retourne
-- des clients d'autres entreprises
-- =====================================================

-- IMPORTANT: Ce script doit être exécuté en tant qu'utilisateur authentifié
-- (utilisateur ID: 8268174b-dc31-4b86-a26d-d530cb003409)

-- 1. Vérifier ce que current_company_id() retourne
SELECT 
  'current_company_id() retourne' as info,
  public.current_company_id() as company_id;

-- 2. Vérifier toutes les entreprises de l'utilisateur connecté
SELECT 
  'Entreprises de l''utilisateur connecté' as info,
  cu.company_id,
  cu.status,
  comp.name as company_name
FROM public.company_users cu
LEFT JOIN public.companies comp ON comp.id = cu.company_id
WHERE cu.user_id = auth.uid()
ORDER BY cu.created_at;

-- 3. Vérifier le client "Khalfallah" et son company_id
SELECT 
  'Client Khalfallah' as info,
  id,
  name,
  company_id,
  user_id,
  created_at
FROM public.clients
WHERE name = 'Khalfallah'
  OR id = '0e3aee91-617c-440f-aaeb-91fe489b32bb';

-- 4. Vérifier si l'utilisateur connecté est membre de l'entreprise du client "Khalfallah"
SELECT 
  'Utilisateur membre de l''entreprise Khalfallah?' as info,
  EXISTS (
    SELECT 1 
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = '223ea7fe-0304-4992-84e6-9b0fef54a32f'
  ) as is_member;

-- 5. Tester la condition RLS manuellement pour le client "Khalfallah"
SELECT 
  'Test condition RLS pour client Khalfallah' as info,
  c.id,
  c.name,
  c.company_id,
  public.current_company_id() as current_company_id,
  -- Condition 1: company_id IS NOT NULL
  c.company_id IS NOT NULL as condition_1,
  -- Condition 2: company_id = current_company_id()
  c.company_id = public.current_company_id() as condition_2,
  -- Condition 3: current_company_id() IS NOT NULL
  public.current_company_id() IS NOT NULL as condition_3,
  -- Condition 4: EXISTS company_users
  EXISTS (
    SELECT 1 
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = c.company_id
  ) as condition_4,
  -- Toutes les conditions
  (
    c.company_id IS NOT NULL
    AND c.company_id = public.current_company_id()
    AND public.current_company_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = c.company_id
    )
  ) as should_be_visible
FROM public.clients c
WHERE c.name = 'Khalfallah'
  OR c.id = '0e3aee91-617c-440f-aaeb-91fe489b32bb';

-- 6. Vérifier ce que RLS retourne réellement (ce que l'utilisateur voit)
SELECT 
  'Clients visibles via RLS' as info,
  id,
  name,
  company_id,
  public.current_company_id() as current_company_id
FROM public.clients
ORDER BY created_at DESC;

-- 7. Vérifier les policies RLS SELECT actives
SELECT 
  'Policies RLS SELECT actives' as info,
  policyname,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT';
