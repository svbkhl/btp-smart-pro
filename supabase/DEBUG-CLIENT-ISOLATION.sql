-- =====================================================
-- DIAGNOSTIC : Vérification de l'isolation des clients
-- =====================================================
-- Ce script permet de vérifier pourquoi les clients 
-- apparaissent dans toutes les entreprises
-- =====================================================

-- 1. Vérifier la structure de la table clients
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'clients'
ORDER BY ordinal_position;

-- 2. Vérifier si le trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'clients';

-- 3. Vérifier les RLS policies
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
AND tablename = 'clients';

-- 4. Vérifier si RLS est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'clients';

-- 5. Tester la fonction current_company_id()
SELECT 
  auth.uid() as current_user_id,
  public.current_company_id() as current_company_id;

-- 6. Vérifier les clients existants et leur company_id
SELECT 
  id,
  name,
  company_id,
  user_id,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 10;

-- 7. Compter les clients par entreprise
SELECT 
  company_id,
  COUNT(*) as client_count
FROM public.clients
GROUP BY company_id
ORDER BY client_count DESC;

-- 8. Vérifier la contrainte de foreign key
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'clients'
AND kcu.column_name = 'company_id';
