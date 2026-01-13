-- ============================================================================
-- 🔍 DIAGNOSTIC : Erreur "invalid input syntax for type uuid: 'events'"
-- ============================================================================
-- Description: Identifie précisément pourquoi PostgreSQL essaie d'insérer "events" comme UUID
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC 1: Vérifier les DEFAULTS sur les colonnes UUID
-- ============================================================================
SELECT 
  'DEFAULTS UUID' as diagnostic_type,
  column_name,
  column_default,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
AND data_type = 'uuid'
ORDER BY ordinal_position;

-- ============================================================================
-- DIAGNOSTIC 2: Lister TOUS les triggers sur events
-- ============================================================================
SELECT 
  'TRIGGERS' as diagnostic_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement,
  action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'events'
ORDER BY action_timing, event_manipulation;

-- ============================================================================
-- DIAGNOSTIC 3: Voir le code source des fonctions de trigger
-- ============================================================================
SELECT 
  'FUNCTIONS CODE' as diagnostic_type,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  SELECT DISTINCT action_statement
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
  AND event_object_table = 'events'
  AND action_statement LIKE '%validate%'
  OR action_statement LIKE '%event%'
)
OR p.oid IN (
  SELECT tgfoid
  FROM pg_trigger
  WHERE tgrelid = 'public.events'::regclass
);

-- ============================================================================
-- DIAGNOSTIC 4: Chercher "events" dans le code des triggers
-- ============================================================================
SELECT 
  'TRIGGER SEARCH' as diagnostic_type,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_trigger t ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
AND t.tgrelid = 'public.events'::regclass
AND (
  pg_get_functiondef(p.oid) ILIKE '%events%'
  OR pg_get_functiondef(p.oid) ILIKE '%TG_TABLE_NAME%'
  OR pg_get_functiondef(p.oid) ILIKE '%current_company_id%'
);

-- ============================================================================
-- DIAGNOSTIC 5: Vérifier les contraintes CHECK
-- ============================================================================
SELECT 
  'CHECK CONSTRAINTS' as diagnostic_type,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name IN (
  SELECT constraint_name
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
  AND table_name = 'events'
  AND constraint_type = 'CHECK'
);

-- ============================================================================
-- DIAGNOSTIC 6: Vérifier les RLS policies (pour voir si elles utilisent "events")
-- ============================================================================
SELECT 
  'RLS POLICIES' as diagnostic_type,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events';

-- ============================================================================
-- DIAGNOSTIC 7: Vérifier current_company_id() et si elle utilise TG_TABLE_NAME
-- ============================================================================
SELECT 
  'CURRENT_COMPANY_ID' as diagnostic_type,
  p.proname,
  pg_get_functiondef(p.oid) as function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'current_company_id';

-- ============================================================================
-- DIAGNOSTIC 8: Chercher toutes les fonctions qui pourraient utiliser "events"
-- ============================================================================
SELECT 
  'FUNCTIONS WITH EVENTS' as diagnostic_type,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
  pg_get_functiondef(p.oid) ILIKE '%events%'
  OR pg_get_functiondef(p.oid) ILIKE '%TG_TABLE_NAME%'
)
AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;
