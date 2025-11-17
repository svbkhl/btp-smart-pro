-- ============================================
-- CORRECTION AUTOMATIQUE : Permissions Storage
-- ============================================
-- Ce script corrige les problèmes de permissions pour l'upload d'images
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
-- ÉTAPE 2 : Vérifier que le bucket est public
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'images' AND public = true
    ) THEN
        RAISE WARNING '⚠️ Le bucket "images" n''est pas public. Allez dans Storage → images → Settings → Activez "Public bucket"';
        -- Essayer de le rendre public (nécessite des droits admin)
        UPDATE storage.buckets SET public = true WHERE name = 'images';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 3 : Supprimer TOUTES les anciennes politiques
-- ============================================

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public can view" ON storage.objects;

-- ============================================
-- ÉTAPE 4 : Créer les politiques RLS CORRECTES
-- ============================================

-- IMPORTANT : La structure des chemins est : folder/userId/fileName
-- Exemple : projects/abc123/image.jpg
-- storage.foldername(name)[1] = "projects" (le folder)
-- storage.foldername(name)[2] = "abc123" (le userId)
-- storage.foldername(name)[3] = "image.jpg" (le fileName)

-- Politique 1 : Permettre l'upload (INSERT)
-- Les utilisateurs peuvent uploader dans leur propre dossier : folder/userId/fileName
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 2 : Permettre la lecture (SELECT)
-- Tout le monde peut voir les images (bucket public)
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Politique 3 : Permettre la suppression (DELETE)
-- Les utilisateurs peuvent supprimer seulement leurs propres images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 4 : Permettre la mise à jour (UPDATE)
-- Les utilisateurs peuvent mettre à jour seulement leurs propres images
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

-- ============================================
-- ÉTAPE 5 : Vérification finale
-- ============================================

-- Afficher le résultat
SELECT 
    '✅ Configuration Storage' as status,
    (SELECT COUNT(*) FROM storage.buckets WHERE name = 'images') as bucket_exists,
    (SELECT public FROM storage.buckets WHERE name = 'images') as is_public,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE tablename = 'objects' 
     AND schemaname = 'storage'
     AND policyname LIKE '%images%') as policies_count;

-- Afficher les politiques créées
SELECT 
    '📋 Politiques créées' as info,
    policyname as nom,
    cmd as operation,
    roles as roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%'
ORDER BY policyname;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- bucket_exists: 1
-- is_public: true
-- policies_count: 4
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
-- ============================================

