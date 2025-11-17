-- ============================================
-- Créer le bucket Storage pour les CVs
-- ============================================

-- Créer le bucket "candidatures" s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidatures',
  'candidatures',
  false, -- Privé (seuls les admins peuvent accéder)
  5242880, -- 5MB max
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Politique RLS pour permettre l'upload public (pour les candidats)
CREATE POLICY IF NOT EXISTS "Public can upload candidatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'candidatures' AND
  (storage.foldername(name))[1] = 'candidatures'
);

-- Politique RLS pour permettre la lecture aux admins uniquement
CREATE POLICY IF NOT EXISTS "Admins can view candidatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'candidatures' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('dirigeant', 'administrateur')
  )
);

-- Politique RLS pour permettre la suppression aux admins uniquement
CREATE POLICY IF NOT EXISTS "Admins can delete candidatures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'candidatures' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('dirigeant', 'administrateur')
  )
);


