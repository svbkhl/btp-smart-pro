-- ============================================
-- CONFIGURATION COMPLÈTE SUPABASE STORAGE
-- ============================================
-- Ce script configure automatiquement les politiques RLS pour le bucket "images"
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- VÉRIFICATION : Le bucket existe-t-il ?
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'images'
    ) THEN
        RAISE EXCEPTION 'Le bucket "images" n''existe pas. Créez-le d''abord dans Supabase Dashboard → Storage → New bucket';
    END IF;
END $$;

-- ============================================
-- VÉRIFICATION : Le bucket est-il public ?
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'images' AND public = true
    ) THEN
        RAISE WARNING 'Le bucket "images" n''est pas public. Allez dans Storage → images → Settings → Activez "Public bucket"';
    END IF;
END $$;

-- ============================================
-- SUPPRIMER LES ANCIENNES POLITIQUES
-- ============================================

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;

-- ============================================
-- CRÉER LES POLITIQUES RLS
-- ============================================

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

-- Politique 4 : Permettre la mise à jour (UPDATE)
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
-- VÉRIFICATION FINALE
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

