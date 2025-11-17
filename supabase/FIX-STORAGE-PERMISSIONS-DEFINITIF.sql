-- ============================================
-- CORRECTION DÉFINITIVE : Permissions Storage Images
-- ============================================
-- Ce script corrige TOUS les problèmes de permissions pour l'upload d'images
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
-- ÉTAPE 3 : Supprimer TOUTES les anciennes politiques
-- ============================================

-- Supprimer toutes les politiques existantes pour le bucket images
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%images%' 
            OR policyname LIKE '%image%'
            OR policyname LIKE '%upload%'
            OR policyname LIKE '%view%'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- ÉTAPE 4 : Créer les politiques RLS CORRECTES
-- ============================================
-- Note: RLS est déjà activé par défaut sur storage.objects dans Supabase
-- Nous n'avons pas besoin de l'activer manuellement

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
-- ÉTAPE 6 : Vérification finale
-- ============================================

-- Vérifier que le bucket existe et est public
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
-- is_public: true
-- max_size_mb: 5.00
-- policy_count: 4
-- ============================================

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
-- Structure des chemins : folder/userId/fileName
-- Exemple : projects/123e4567-e89b-12d3-a456-426614174000/image.jpg
-- 
-- Les politiques RLS vérifient que (storage.foldername(name))[2] = auth.uid()
-- [1] = folder (projects, clients, quotes, analysis)
-- [2] = userId (doit correspondre à auth.uid())
-- [3] = fileName
-- 
-- Pour tester manuellement :
-- 1. Connectez-vous dans l'application
-- 2. Uploadez une image pour un projet
-- 3. Vérifiez que le chemin est : projects/{votre_user_id}/{nom_fichier}
-- 4. Vérifiez que l'image s'affiche
-- ============================================

