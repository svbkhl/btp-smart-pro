-- ============================================
-- SCRIPT COMPLET : CONFIGURATION EN UNE FOIS
-- ============================================
-- Ce script vérifie et configure tout automatiquement
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- PARTIE 1 : VÉRIFIER ET CONFIGURER STORAGE
-- ============================================

-- Vérifier que le bucket existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'images') THEN
        RAISE EXCEPTION '❌ Le bucket "images" n''existe pas. Créez-le dans Storage → New bucket';
    END IF;
END $$;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;

-- Créer les politiques
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- PARTIE 2 : VÉRIFIER LES TABLES PRINCIPALES
-- ============================================

-- Vérifier les tables principales
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
AND table_name IN ('clients', 'projects', 'user_stats', 'user_settings', 'events', 'email_queue')
ORDER BY table_name;

-- ============================================
-- PARTIE 3 : RÉSUMÉ FINAL
-- ============================================

SELECT 
    '📊 RÉSUMÉ' as section,
    (SELECT COUNT(*) FROM storage.buckets WHERE name = 'images') as bucket_images,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%images%') as politiques_storage,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('clients', 'projects', 'user_stats', 'user_settings', 'events', 'email_queue')) as tables_principales;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- bucket_images: 1
-- politiques_storage: 4
-- tables_principales: 6
-- ============================================

