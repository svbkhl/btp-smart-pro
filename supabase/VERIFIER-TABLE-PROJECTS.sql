-- ============================================
-- VÉRIFICATION : Table Projects
-- ============================================
-- Ce script vérifie si la table projects existe
-- et affiche sa structure
-- ============================================

-- Vérifier si la table existe
SELECT 
    'Vérification table projects' as verification,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'projects'
        ) THEN '✅ Table existe'
        ELSE '❌ Table n''existe pas'
    END as status;

-- Afficher la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

-- Vérifier les RLS policies
SELECT 
    'RLS Policies' as verification,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'SELECT/UPDATE/DELETE'
        WHEN with_check IS NOT NULL THEN 'INSERT/UPDATE'
        ELSE 'AUTRE'
    END as type
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'projects';

-- Vérifier si RLS est activé
SELECT 
    'RLS Status' as verification,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'projects';

-- Vérifier les contraintes
SELECT 
    'Contraintes' as verification,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.projects'::regclass;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- Table existe : ✅
-- Colonnes : id, user_id, client_id, name, status, progress, budget, location, start_date, end_date, description, image_url, created_at, updated_at
-- RLS Policies : 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- RLS Status : true (activé)
-- ============================================

    