-- =====================================================
-- VÉRIFIER LE TRIGGER ET LA TABLE USERS
-- =====================================================
-- Script pour identifier le problème "Database error saving new user"
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. VÉRIFIER LE TRIGGER on_auth_user_created
-- ═══════════════════════════════════════════════════

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- ═══════════════════════════════════════════════════
-- 2. VÉRIFIER LA FONCTION handle_new_user()
-- ═══════════════════════════════════════════════════

SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- ═══════════════════════════════════════════════════
-- 3. VÉRIFIER LA STRUCTURE DE LA TABLE users (si elle existe)
-- ═══════════════════════════════════════════════════

SELECT 
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
-- 5. VÉRIFIER LA STRUCTURE DE auth.users (colonnes critiques)
-- ═══════════════════════════════════════════════════

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
  AND column_name IN ('raw_user_meta_data', 'user_metadata', 'email', 'id')
ORDER BY column_name;






