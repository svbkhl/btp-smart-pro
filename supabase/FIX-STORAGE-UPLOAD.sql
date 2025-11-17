-- ============================================
-- CORRECTION : Configuration Storage pour Upload
-- ============================================
-- Ce script corrige les problèmes d'upload d'images
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
        RAISE EXCEPTION '❌ Le bucket "images" n''existe pas. Créez-le dans Storage → New bucket';
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
    END IF;
END $$;

-- ============================================
-- ÉTAPE 3 : Supprimer les anciennes politiques
-- ============================================

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;

-- ============================================
-- ÉTAPE 4 : Créer les politiques RLS
-- ============================================

-- Politique 1 : Permettre l'upload (INSERT)
-- Les utilisateurs peuvent uploader dans leur propre dossier : folder/userId/fileName
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 2 : Permettre la lecture (SELECT)
-- Tout le monde peut voir les images (bucket public)
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

-- Politique 3 : Permettre la suppression (DELETE)
-- Les utilisateurs peuvent supprimer seulement leurs propres images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique 4 : Permettre la mise à jour (UPDATE)
-- Les utilisateurs peuvent mettre à jour seulement leurs propres images
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
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
    'Politiques créées' as info,
    policyname,
    cmd as operation
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
-- La structure des fichiers est : folder/userId/fileName
-- Exemple : projects/123e4567-e89b-12d3-a456-426614174000/image.jpg
-- 
-- Les politiques RLS vérifient que (storage.foldername(name))[2] = auth.uid()
-- Cela correspond au userId dans le chemin : folder/userId/fileName
-- [1] = folder (projects, clients, etc.)
-- [2] = userId
-- [3] = fileName
-- ============================================

