-- ============================================
-- SCRIPT DE VÉRIFICATION DU BACKEND
-- ============================================
-- Exécutez ce script après avoir appliqué BACKEND-COMPLET.sql
-- pour vérifier que tout est bien créé
-- ============================================

-- ============================================
-- 1. VÉRIFIER LES TABLES
-- ============================================

SELECT 
  'Tables' as section,
  table_name,
  CASE 
    WHEN table_name IN (
      'profiles', 'user_roles', 'clients', 'projects', 'user_stats', 
      'user_settings', 'events', 'employees', 'employee_assignments',
      'ai_quotes', 'notifications', 'candidatures', 'taches_rh',
      'rh_activities', 'employee_performances', 'maintenance_reminders',
      'image_analysis', 'ai_conversations', 'email_queue'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'user_roles', 'clients', 'projects', 'user_stats', 
  'user_settings', 'events', 'employees', 'employee_assignments',
  'ai_quotes', 'notifications', 'candidatures', 'taches_rh',
  'rh_activities', 'employee_performances', 'maintenance_reminders',
  'image_analysis', 'ai_conversations', 'email_queue'
)
ORDER BY table_name;

-- ============================================
-- 2. VÉRIFIER LES INDEXES
-- ============================================

SELECT 
  'Indexes' as section,
  tablename,
  indexname,
  '✅ Existe' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- 3. VÉRIFIER LES TRIGGERS
-- ============================================

SELECT 
  'Triggers' as section,
  event_object_table as table_name,
  trigger_name,
  '✅ Existe' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 4. VÉRIFIER RLS (Row Level Security)
-- ============================================

SELECT 
  'RLS' as section,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ Activé'
    ELSE '❌ Désactivé'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'user_roles', 'clients', 'projects', 'user_stats', 
  'user_settings', 'events', 'employees', 'employee_assignments',
  'ai_quotes', 'notifications', 'candidatures', 'taches_rh',
  'rh_activities', 'employee_performances', 'maintenance_reminders',
  'image_analysis', 'ai_conversations', 'email_queue'
)
ORDER BY tablename;

-- ============================================
-- 5. VÉRIFIER LES POLITIQUES RLS
-- ============================================

SELECT 
  'Politiques RLS' as section,
  tablename,
  policyname,
  cmd as operation,
  '✅ Existe' as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 6. VÉRIFIER LES FONCTIONS
-- ============================================

SELECT 
  'Fonctions' as section,
  routine_name,
  '✅ Existe' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_updated_at_column', 'handle_new_user')
ORDER BY routine_name;

-- ============================================
-- 7. RÉSUMÉ
-- ============================================

SELECT 
  'RÉSUMÉ' as section,
  'Total tables' as item,
  COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'user_roles', 'clients', 'projects', 'user_stats', 
  'user_settings', 'events', 'employees', 'employee_assignments',
  'ai_quotes', 'notifications', 'candidatures', 'taches_rh',
  'rh_activities', 'employee_performances', 'maintenance_reminders',
  'image_analysis', 'ai_conversations', 'email_queue'
);

SELECT 
  'RÉSUMÉ' as section,
  'Total politiques RLS' as item,
  COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public';

SELECT 
  'RÉSUMÉ' as section,
  'Total indexes' as item,
  COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- ============================================
-- FIN DE LA VÉRIFICATION
-- ============================================

