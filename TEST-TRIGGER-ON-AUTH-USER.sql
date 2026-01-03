-- =====================================================
-- TEST DU TRIGGER on_auth_user_created
-- =====================================================
-- Ce script teste si le trigger fonctionne correctement
-- =====================================================

-- ═══════════════════════════════════════════════════
-- ÉTAPE 1 : VÉRIFIER QUE LE TRIGGER EXISTE
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
-- ÉTAPE 2 : VÉRIFIER LA FONCTION handle_new_user()
-- ═══════════════════════════════════════════════════

SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- ═══════════════════════════════════════════════════
-- ÉTAPE 3 : TESTER LE TRIGGER (ATTENTION : Ne pas exécuter en production)
-- ═══════════════════════════════════════════════════
-- ⚠️ Ce test crée un utilisateur de test dans auth.users
-- ⚠️ Supprimez-le après le test

-- Créer un utilisateur de test pour voir si le trigger fonctionne
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
-- VALUES (
--   gen_random_uuid(),
--   'test-trigger-' || extract(epoch from now())::text || '@example.com',
--   crypt('test', gen_salt('bf')),
--   now(),
--   now(),
--   now(),
--   '{}'::jsonb
-- );

-- ═══════════════════════════════════════════════════
-- ÉTAPE 4 : VÉRIFIER SI LES TABLES EXISTENT
-- ═══════════════════════════════════════════════════

SELECT 
  'Tables check' as info,
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = table_name
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
  ('user_stats'),
  ('user_settings'),
  ('user_roles')
) AS t(table_name);

-- ═══════════════════════════════════════════════════
-- ÉTAPE 5 : VÉRIFIER LA STRUCTURE DE user_roles
-- ═══════════════════════════════════════════════════

SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_roles'
ORDER BY ordinal_position;







