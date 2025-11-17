-- Ajouter le champ signature_data à user_settings
-- Cette signature sera utilisée automatiquement pour tous les devis

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS signature_data TEXT;

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS signature_name TEXT;

COMMENT ON COLUMN public.user_settings.signature_data IS 'Signature électronique en base64 (image PNG) pour les devis automatiques';
COMMENT ON COLUMN public.user_settings.signature_name IS 'Nom du signataire pour la signature automatique';


