-- =====================================================
-- DIAGNOSTIC : Pourquoi RLS échoue
-- =====================================================
-- Ce script vérifie pourquoi l'utilisateur peut voir
-- des clients d'autres entreprises
-- =====================================================

-- 1. Vérifier si l'utilisateur est membre de l'entreprise du client "Khalfallah"
-- Company ID du client "Khalfallah": 223ea7fe-0304-4992-84e6-9b0fef54a32f
SELECT 
  'Vérification membre entreprise Khalfallah' as info,
  cu.user_id,
  cu.company_id,
  cu.status,
  comp.name as company_name
FROM public.company_users cu
LEFT JOIN public.companies comp ON comp.id = cu.company_id
WHERE cu.company_id = '223ea7fe-0304-4992-84e6-9b0fef54a32f';

-- 2. Vérifier toutes les entreprises de TOUS les utilisateurs qui ont créé un client "Khalfallah"
SELECT 
  'Entreprises des créateurs du client Khalfallah' as info,
  c.id as client_id,
  c.name as client_name,
  c.user_id,
  c.company_id,
  cu_member.company_id as user_company_id,
  cu_member.status as user_status
FROM public.clients c
LEFT JOIN public.company_users cu_member ON cu_member.user_id = c.user_id
WHERE c.name = 'Khalfallah'
  OR c.id = '0e3aee91-617c-440f-aaeb-91fe489b32bb';

-- 3. Vérifier les RLS policies SELECT actuelles et leurs conditions
SELECT 
  'RLS Policies SELECT - Analyse' as info,
  policyname,
  cmd,
  permissive,
  qual as using_expression,
  -- Vérifier si la policy utilise user_id ou company_id
  CASE 
    WHEN qual LIKE '%user_id%' OR qual LIKE '%auth.uid()%' THEN '❌ Utilise user_id - MAUVAIS'
    WHEN qual LIKE '%company_id%' THEN '✅ Utilise company_id - BON'
    ELSE '⚠️ Non détecté'
  END as type_policy
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT';

-- 4. Tester la fonction current_company_id() pour un utilisateur spécifique
-- Remplacez USER_ID par l'ID de l'utilisateur 8268174b-dc31-4b86-a26d-d530cb003409
SELECT 
  'Test current_company_id()' as info,
  auth.uid() as current_user_id,
  public.current_company_id() as current_company_id_returned;

-- 5. Vérifier si des policies PERMISSIVE existent (par défaut, elles le sont)
SELECT 
  'Policies PERMISSIVE vs RESTRICTIVE' as info,
  policyname,
  cmd,
  permissive,
  CASE 
    WHEN permissive THEN '⚠️ PERMISSIVE - peut permettre l''accès'
    ELSE '✅ RESTRICTIVE - plus strict'
  END as type_policy
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients';

-- 6. Simuler ce que RLS retournerait pour l'utilisateur actuel
-- (nécessite d'être connecté en tant que cet utilisateur)
SELECT 
  'Simulation RLS pour utilisateur actuel' as info,
  c.id,
  c.name,
  c.company_id,
  public.current_company_id() as current_company_id,
  c.company_id = public.current_company_id() as company_id_matches,
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = c.company_id
  ) as user_is_member
FROM public.clients c;
