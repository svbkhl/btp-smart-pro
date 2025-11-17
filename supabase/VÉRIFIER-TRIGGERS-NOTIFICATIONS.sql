-- ============================================
-- VÉRIFICATION : Triggers pour Notifications
-- ============================================
-- Ce script vérifie que tous les triggers pour créer
-- automatiquement des notifications sont configurés
-- ============================================

-- ============================================
-- 1. Vérifier la fonction create_notification
-- ============================================

SELECT 
    '✅ Fonction create_notification' as status,
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'create_notification'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- 2. Vérifier les triggers sur la table projects
-- ============================================

SELECT 
    'Triggers sur projects' as info,
    tgname as trigger_name,
    tgenabled as is_enabled,
    tgisinternal as is_internal
FROM pg_trigger
WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = 'projects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
AND tgname LIKE '%notify%'
ORDER BY tgname;

-- ============================================
-- 3. Vérifier les triggers sur la table clients
-- ============================================

SELECT 
    'Triggers sur clients' as info,
    tgname as trigger_name,
    tgenabled as is_enabled,
    tgisinternal as is_internal
FROM pg_trigger
WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = 'clients' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
AND tgname LIKE '%notify%'
ORDER BY tgname;

-- ============================================
-- 4. Liste complète des triggers attendus
-- ============================================

-- Triggers attendus sur projects :
-- - trigger_notify_project_created
-- - trigger_notify_project_overdue
-- - trigger_notify_project_status_change

-- Triggers attendus sur clients :
-- - trigger_notify_client_created

-- ============================================
-- 5. Vérifier les fonctions de trigger
-- ============================================

SELECT 
    'Fonctions de trigger' as info,
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN (
    'notify_on_project_created',
    'notify_on_project_overdue',
    'notify_on_project_status_change',
    'notify_on_client_created'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- 1. Fonction create_notification : 1 ligne
-- 2. Triggers sur projects : 3 lignes
-- 3. Triggers sur clients : 1 ligne
-- 4. Fonctions de trigger : 4 lignes
-- ============================================

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
-- Si les triggers n'existent pas, exécutez :
-- supabase/CREATE-EMAIL-SYSTEM.sql
-- ============================================

