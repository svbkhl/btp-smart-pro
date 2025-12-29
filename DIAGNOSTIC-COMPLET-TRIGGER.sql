-- =====================================================
-- DIAGNOSTIC COMPLET : Trigger et Table users
-- =====================================================
-- Exécutez ce script pour identifier le problème exact
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. VÉRIFIER LE TRIGGER on_auth_user_created
-- ═══════════════════════════════════════════════════

SELECT 
  'TRIGGER INFO' as info_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- ═══════════════════════════════════════════════════
-- 2. VÉRIFIER LA FONCTION handle_new_user() - CODE COMPLET
-- ═══════════════════════════════════════════════════

SELECT 
  'FUNCTION CODE' as info_type,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- ═══════════════════════════════════════════════════
-- 3. VÉRIFIER LA STRUCTURE DE LA TABLE users (si elle existe)
-- ═══════════════════════════════════════════════════

SELECT 
  'TABLE users STRUCTURE' as info_type,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════
-- 4. VÉRIFIER LES CONTRAINTES UNIQUES SUR users
-- ═══════════════════════════════════════════════════

SELECT 
  'CONSTRAINTS on users' as info_type,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'users'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');

-- ═══════════════════════════════════════════════════
-- 5. VÉRIFIER L'ENUM app_role
-- ═══════════════════════════════════════════════════

SELECT 
  'ENUM app_role VALUES' as info_type,
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- ═══════════════════════════════════════════════════
-- 6. VÉRIFIER LA STRUCTURE DE user_roles
-- ═══════════════════════════════════════════════════

SELECT 
  'TABLE user_roles STRUCTURE' as info_type,
  column_name, 
  data_type, 
  is_nullable,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_roles'
ORDER BY ordinal_position;






