-- ============================================
-- CONFIGURATION SUPABASE STORAGE
-- ============================================
-- Ce script configure le bucket "images" et les politiques RLS
-- pour l'upload d'images dans l'application
--
-- INSTRUCTIONS :
-- 1. Créez d'abord le bucket "images" dans Supabase Dashboard > Storage
-- 2. Puis exécutez ce script dans SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Créer le bucket "images"
-- ============================================
-- NOTE : Cette étape doit être faite MANUELLEMENT dans Supabase Dashboard
-- 1. Allez dans Storage
-- 2. Cliquez sur "New bucket"
-- 3. Nom : "images"
-- 4. Public bucket : Activé
-- 5. File size limit : 5242880 (5MB)
-- 6. Allowed MIME types : image/jpeg,image/jpg,image/png,image/webp,image/gif
-- 7. Cliquez sur "Create bucket"

-- ============================================
-- ÉTAPE 2 : Créer les politiques RLS
-- ============================================

-- Activer RLS sur storage.objects (si ce n'est pas déjà fait)
-- Note: RLS est généralement déjà activé par défaut sur storage.objects

-- Supprimer les politiques existantes si elles existent (pour éviter les conflits)
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Politique 1 : Permettre l'upload (INSERT)
-- Les utilisateurs peuvent uploader seulement dans leur propre dossier
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
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
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique 4 : Permettre la mise à jour (UPDATE) - Optionnel
-- Les utilisateurs peuvent mettre à jour seulement leurs propres images
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que le bucket existe
-- Cette requête devrait retourner une ligne si le bucket existe
SELECT * FROM storage.buckets WHERE name = 'images';

-- Vérifier que les politiques sont créées
-- Cette requête devrait retourner 4 lignes (les 4 politiques)
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%';

-- ============================================
-- FIN DE LA CONFIGURATION
-- ============================================

