-- ============================================
-- VÉRIFICATION : Table Notifications
-- ============================================
-- Ce script vérifie si la table notifications existe
-- ============================================

-- Vérifier si la table existe
SELECT 
    'Vérification table notifications' as verification,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
        ) THEN '✅ Table existe'
        ELSE '❌ Table n''existe pas'
    END as status;

-- Afficher la structure de la table si elle existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Vérifier les RLS policies
SELECT 
    'RLS Policies' as verification,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications'
ORDER BY policyname;

-- Vérifier si RLS est activé
SELECT 
    'RLS Status' as verification,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- ============================================
-- RÉSULTAT ATTENDU SI LA TABLE EXISTE
-- ============================================
-- status: ✅ Table existe
-- columns: 9 colonnes (id, user_id, title, message, type, related_table, related_id, is_read, created_at, read_at)
-- policies: 5 politiques
-- rls_enabled: true
-- ============================================

