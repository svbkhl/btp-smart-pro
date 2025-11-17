-- ============================================
-- SCRIPT DE VÉRIFICATION COMPLÈTE
-- ============================================
-- Ce script vérifie que toutes les tables et configurations sont en place
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. VÉRIFIER LES TABLES PRINCIPALES
-- ============================================

SELECT 
    'Tables principales' as section,
    table_name,
    CASE 
        WHEN table_name IN ('clients', 'projects', 'user_stats', 'user_settings', 'events', 'email_queue')
        THEN '✅ Existe'
        ELSE '❌ Manquante'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'clients',
    'projects',
    'user_stats',
    'user_settings',
    'events',
    'email_queue'
)
ORDER BY table_name;

-- ============================================
-- 2. VÉRIFIER LES TABLES IA
-- ============================================

SELECT 
    'Tables IA' as section,
    table_name,
    CASE 
        WHEN table_name IN ('ai_conversations', 'ai_quotes', 'image_analysis', 'maintenance_reminders')
        THEN '✅ Existe'
        ELSE '❌ Manquante'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'ai_conversations',
    'ai_quotes',
    'image_analysis',
    'maintenance_reminders'
)
ORDER BY table_name;

-- ============================================
-- 3. VÉRIFIER LE BUCKET STORAGE
-- ============================================

SELECT 
    'Storage' as section,
    name as bucket_name,
    CASE 
        WHEN name = 'images' THEN '✅ Existe'
        ELSE '❌ Manquant'
    END as status,
    public as is_public
FROM storage.buckets 
WHERE name = 'images';

-- ============================================
-- 4. VÉRIFIER LES POLITIQUES STORAGE
-- ============================================

SELECT 
    'Politiques Storage' as section,
    policyname,
    CASE 
        WHEN policyname LIKE '%images%' THEN '✅ Existe'
        ELSE '❌ Manquante'
    END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%'
ORDER BY policyname;

-- ============================================
-- 5. VÉRIFIER LES POLITIQUES RLS DES TABLES
-- ============================================

SELECT 
    'RLS Tables' as section,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ RLS activé'
        ELSE '❌ RLS non configuré'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('clients', 'projects', 'user_stats', 'user_settings', 'events', 'email_queue')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 6. RÉSUMÉ
-- ============================================

SELECT 
    'RÉSUMÉ' as section,
    COUNT(DISTINCT table_name) as tables_principales,
    (SELECT COUNT(*) FROM storage.buckets WHERE name = 'images') as bucket_images,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%images%') as politiques_storage
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'clients',
    'projects',
    'user_stats',
    'user_settings',
    'events',
    'email_queue'
);

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- Tables principales : 6 tables
-- Bucket images : 1 bucket
-- Politiques Storage : 4 politiques
-- ============================================

