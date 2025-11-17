-- Ajouter la colonne legal_form à user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS legal_form TEXT;

COMMENT ON COLUMN public.user_settings.legal_form IS 'Forme juridique de l''entreprise (SARL, SASU, auto-entrepreneur, etc.)';


