-- Ajouter la colonne app_base_url à user_settings
-- Permet de configurer l'URL de base de l'application pour les liens de signature

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS app_base_url TEXT;

COMMENT ON COLUMN public.user_settings.app_base_url IS 'URL de base de l''application pour les liens de signature (ex: https://votre-app.vercel.app ou https://abc123.ngrok.io)';


















