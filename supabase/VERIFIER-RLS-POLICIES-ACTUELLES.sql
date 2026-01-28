-- =====================================================
-- VÉRIFICATION : RLS Policies actuelles pour clients
-- =====================================================
-- Ce script vérifie quelles RLS policies sont actives
-- et si elles utilisent company_id ou user_id
-- =====================================================

-- 1. Vérifier toutes les policies pour clients
SELECT 
  'Toutes les policies pour clients' as info,
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

-- 2. Vérifier si RLS est activé
SELECT 
  'RLS Status' as info,
  relname,
  relforcerowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;

-- 3. Vérifier si les policies utilisent user_id (❌ MAUVAIS) ou company_id (✅ BON)
SELECT 
  'Analyse des policies' as info,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%user_id%' OR qual LIKE '%auth.uid()%' THEN '❌ Utilise user_id - MAUVAIS'
    WHEN qual LIKE '%company_id%' THEN '✅ Utilise company_id - BON'
    ELSE '⚠️ Non détecté'
  END as type_policy
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
ORDER BY cmd, policyname;

-- 4. Vérifier la fonction current_company_id
SELECT 
  'Fonction current_company_id' as info,
  proname,
  prorettype::regtype as return_type,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'current_company_id';

-- 5. Vérifier si le trigger force_company_id existe
SELECT 
  'Triggers force_company_id sur clients' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'clients'
  AND trigger_name LIKE '%force_company_id%';
