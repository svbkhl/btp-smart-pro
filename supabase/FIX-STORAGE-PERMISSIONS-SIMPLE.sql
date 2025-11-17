-- ============================================
-- CORRECTION SIMPLIFIÉE : Permissions Storage Images
-- ============================================
-- Ce script corrige les problèmes de permissions pour l'upload d'images
-- Version simplifiée qui ne nécessite pas de permissions administrateur
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Vérifier que le bucket existe
-- ============================================

-- Note: Si le bucket n'existe pas, créez-le manuellement dans Storage → New bucket
-- Nom: images, Public: Activé, File size limit: 5 MB

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'images'
    ) THEN
        RAISE WARNING '⚠️ Le bucket "images" n''existe pas. Créez-le manuellement dans Storage → New bucket → Nom: images → Public: Activé';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : Supprimer TOUTES les anciennes politiques
-- ============================================

-- Supprimer toutes les politiques existantes pour le bucket images
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public can view" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- ============================================
-- ÉTAPE 3 : Créer les politiques RLS CORRECTES
-- ============================================

-- IMPORTANT : La structure des chemins est : folder/userId/fileName
-- Exemple : projects/abc123-def456/image.jpg
-- storage.foldername(name)[1] = "projects" (le folder)
-- storage.foldername(name)[2] = "abc123-def456" (le userId)
-- storage.foldername(name)[3] = "image.jpg" (le fileName)

-- Politique 1 : INSERT - Les utilisateurs peuvent uploader dans leur propre dossier
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 2 : SELECT - Tout le monde peut voir les images (bucket public)
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Politique 3 : UPDATE - Les utilisateurs peuvent mettre à jour leurs propres images
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 4 : DELETE - Les utilisateurs peuvent supprimer leurs propres images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- ÉTAPE 4 : Vérification finale
-- ============================================

-- Vérifier que le bucket existe
SELECT 
    '✅ Bucket Configuration' as status,
    name as bucket_name,
    public as is_public,
    COALESCE((file_size_limit / 1024 / 1024)::numeric(10,2), 0) as max_size_mb
FROM storage.buckets
WHERE name = 'images';

-- Vérifier les politiques créées
SELECT 
    '✅ Politiques RLS' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%images%';

-- Afficher les politiques créées
SELECT 
    '📋 Politiques créées' as info,
    policyname as nom,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%images%'
ORDER BY 
    CASE cmd
        WHEN 'INSERT' THEN 1
        WHEN 'SELECT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- bucket_name: images
-- is_public: true (ou NULL si le bucket n'existe pas encore)
-- policy_count: 4
-- ============================================

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
-- Si le bucket n'existe pas :
-- 1. Allez dans Storage → New bucket
-- 2. Nom: images
-- 3. Public: Activé (ON)
-- 4. File size limit: 5 MB
-- 5. Allowed MIME types: image/jpeg,image/jpg,image/png,image/webp,image/gif
-- 6. Cliquez sur "Create bucket"
-- 
-- Structure des chemins : folder/userId/fileName
-- Exemple : projects/123e4567-e89b-12d3-a456-426614174000/image.jpg
-- 
-- Les politiques RLS vérifient que (storage.foldername(name))[2] = auth.uid()
-- [1] = folder (projects, clients, quotes, analysis)
-- [2] = userId (doit correspondre à auth.uid())
-- [3] = fileName
-- ============================================

