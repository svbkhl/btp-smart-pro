-- ============================================================================
-- 🔍 DIAGNOSTIC : JWT claim project_id injectant "events" comme UUID
-- ============================================================================
-- Objectif: Identifier toutes les policies RLS et triggers qui utilisent
--           request.jwt.claim.project_id et peuvent injecter "events"
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC 1: Chercher toutes les policies RLS qui utilisent JWT claims
-- ============================================================================
SELECT 
  'RLS POLICIES WITH JWT' as diagnostic_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events'
AND (
  qual ILIKE '%jwt%'
  OR qual ILIKE '%request.jwt%'
  OR qual ILIKE '%current_setting%'
  OR with_check ILIKE '%jwt%'
  OR with_check ILIKE '%request.jwt%'
  OR with_check ILIKE '%current_setting%'
);

-- ============================================================================
-- DIAGNOSTIC 2: Chercher tous les triggers qui utilisent JWT claims
-- ============================================================================
SELECT 
  'TRIGGERS WITH JWT' as diagnostic_type,
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_code
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'events'
AND NOT t.tgisinternal
AND (
  pg_get_functiondef(p.oid) ILIKE '%jwt%'
  OR pg_get_functiondef(p.oid) ILIKE '%request.jwt%'
  OR pg_get_functiondef(p.oid) ILIKE '%current_setting%'
  OR pg_get_functiondef(p.oid) ILIKE '%project_id%'
);

-- ============================================================================
-- DIAGNOSTIC 3: Chercher les fonctions qui assignent project_id depuis JWT
-- ============================================================================
SELECT 
  'FUNCTIONS ASSIGNING PROJECT_ID' as diagnostic_type,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
  pg_get_functiondef(p.oid) ~ 'NEW\.project_id\s*:=\s*.*current_setting'
  OR pg_get_functiondef(p.oid) ~ 'NEW\.project_id\s*:=\s*.*jwt'
  OR pg_get_functiondef(p.oid) ~ 'NEW\.project_id\s*:=\s*.*request\.jwt'
);

-- ============================================================================
-- DIAGNOSTIC 4: Vérifier la structure de la table events
-- ============================================================================
SELECT 
  'TABLE STRUCTURE' as diagnostic_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
ORDER BY ordinal_position;

-- ============================================================================
-- DIAGNOSTIC 5: Vérifier les contraintes FK sur project_id
-- ============================================================================
SELECT 
  'FOREIGN KEYS' as diagnostic_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'events'
AND kcu.column_name = 'project_id';

-- ============================================================================
-- DIAGNOSTIC 6: Vérifier toutes les policies RLS sur events
-- ============================================================================
SELECT 
  'ALL RLS POLICIES' as diagnostic_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events'
ORDER BY policyname;
