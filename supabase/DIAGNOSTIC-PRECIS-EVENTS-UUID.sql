-- ============================================================================
-- 🔍 DIAGNOSTIC PRÉCIS : Erreur "invalid input syntax for type uuid: 'events'"
-- ============================================================================
-- Objectif: Identifier EXACTEMENT où "events" est injecté comme UUID
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC 1: Voir TOUS les triggers avec leur code source complet
-- ============================================================================
SELECT 
  'TRIGGER DETAILS' as diagnostic_type,
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE t.tgtype::integer & 28
    WHEN 16 THEN 'UPDATE'
    WHEN 8 THEN 'DELETE'
    WHEN 4 THEN 'INSERT'
    WHEN 20 THEN 'INSERT, UPDATE'
    WHEN 28 THEN 'INSERT, UPDATE, DELETE'
  END as events,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_source_code
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'events'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- ============================================================================
-- DIAGNOSTIC 2: Chercher "events" ou TG_TABLE_NAME dans le code des triggers
-- ============================================================================
SELECT 
  'TRIGGER WITH EVENTS STRING' as diagnostic_type,
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
  pg_get_functiondef(p.oid) ILIKE '%events%'
  OR pg_get_functiondef(p.oid) ILIKE '%TG_TABLE_NAME%'
  OR pg_get_functiondef(p.oid) ILIKE '%TG_RELNAME%'
  OR pg_get_functiondef(p.oid) ILIKE '%current_company_id%'
  OR pg_get_functiondef(p.oid) ILIKE '%NEW.%'
);

-- ============================================================================
-- DIAGNOSTIC 3: Vérifier les DEFAULTS sur colonnes UUID
-- ============================================================================
SELECT 
  'DEFAULTS' as diagnostic_type,
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
-- DIAGNOSTIC 4: Vérifier si un trigger assigne TG_TABLE_NAME à une colonne UUID
-- ============================================================================
SELECT 
  'TG_TABLE_NAME ASSIGNMENT' as diagnostic_type,
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
  pg_get_functiondef(p.oid) ~ 'NEW\.(user_id|company_id|project_id)\s*:=\s*.*TG_TABLE_NAME'
  OR pg_get_functiondef(p.oid) ~ 'NEW\.(user_id|company_id|project_id)\s*:=\s*.*events'
  OR pg_get_functiondef(p.oid) ~ 'NEW\.(user_id|company_id|project_id)\s*:=\s*.*TG_RELNAME'
);

-- ============================================================================
-- DIAGNOSTIC 5: Vérifier current_company_id() et si elle retourne "events"
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
-- DIAGNOSTIC 6: Vérifier les RLS policies qui pourraient utiliser "events"
-- ============================================================================
SELECT 
  'RLS POLICIES' as diagnostic_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events';

-- ============================================================================
-- DIAGNOSTIC 7: Vérifier la structure exacte de la table
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
