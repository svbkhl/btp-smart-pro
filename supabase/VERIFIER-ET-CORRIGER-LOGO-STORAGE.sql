-- ============================================
-- VÉRIFICATION ET CORRECTION : Permissions Storage pour Logo
-- ============================================
-- Ce script vérifie et corrige les permissions pour que les logos
-- puissent être chargés depuis le frontend
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Vérifier que le bucket existe
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'images'
    ) THEN
        RAISE EXCEPTION '❌ Le bucket "images" n''existe pas. Créez-le dans Storage → New bucket → Nom: images → Public: Activé';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : Vérifier et corriger que le bucket est public
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'images' AND public = true
    ) THEN
        RAISE WARNING '⚠️ Le bucket "images" n''est pas public. Tentative de correction...';
        UPDATE storage.buckets SET public = true WHERE name = 'images';
        RAISE NOTICE '✅ Bucket "images" rendu public';
    ELSE
        RAISE NOTICE '✅ Bucket "images" est déjà public';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 3 : Supprimer les anciennes politiques pour éviter les conflits
-- ============================================

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;

-- ============================================
-- ÉTAPE 4 : Créer les politiques RLS CORRECTES
-- ============================================

-- IMPORTANT : La structure des chemins est : folder/userId/fileName
-- Exemple : projects/abc123-def456/image.jpg
-- storage.foldername(name)[1] = "projects" (le folder)
-- storage.foldername(name)[2] = "abc123-def456" (le userId)
-- storage.foldername(name)[3] = "image.jpg" (le fileName)

-- Politique 1 : SELECT - Tout le monde peut voir les images (bucket public)
-- C'EST LA PLUS IMPORTANTE POUR LE LOGO
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Politique 2 : INSERT - Les utilisateurs peuvent uploader dans leur propre dossier
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

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
-- ÉTAPE 5 : Vérification finale
-- ============================================

-- Vérifier que le bucket existe et est public
SELECT 
    '✅ Configuration Bucket' as status,
    name as bucket_name,
    public as is_public,
    COALESCE((file_size_limit / 1024 / 1024)::numeric(10,2), 0) as max_size_mb
FROM storage.buckets
WHERE name = 'images';

-- Vérifier les politiques créées
SELECT 
    '✅ Politiques RLS' as status,
    policyname as nom_politique,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%images%'
ORDER BY policyname;

-- Compter les politiques
SELECT 
    '📊 Résumé' as info,
    COUNT(*) as nombre_politiques
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%images%';

-- ============================================
-- INSTRUCTIONS POST-EXÉCUTION
-- ============================================
-- 1. Vérifiez que le bucket "images" est bien public dans Storage → images → Settings
-- 2. Testez le chargement d'une image dans l'application
-- 3. Si l'image ne se charge toujours pas, vérifiez l'URL dans le navigateur
-- 4. Assurez-vous que l'image existe bien dans Storage → images → projects → [userId] → [fileName]
