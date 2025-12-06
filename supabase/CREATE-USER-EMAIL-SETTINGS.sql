-- =====================================================
-- CRÉATION DE LA TABLE user_email_settings
-- =====================================================
-- Cette table stocke la configuration email de chaque utilisateur
-- Supporte Gmail OAuth, Outlook OAuth, et SMTP classique
-- =====================================================

-- 1️⃣ Créer la table user_email_settings
CREATE TABLE IF NOT EXISTS public.user_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'smtp', 'resend')),
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  from_email TEXT,
  from_name TEXT,
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
    -- Ajouter oauth_access_token si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_email_settings' 
        AND column_name = 'oauth_access_token'
    ) THEN
        ALTER TABLE public.user_email_settings ADD COLUMN oauth_access_token TEXT;
    END IF;
    
    -- Ajouter oauth_refresh_token si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_email_settings' 
        AND column_name = 'oauth_refresh_token'
    ) THEN
        ALTER TABLE public.user_email_settings ADD COLUMN oauth_refresh_token TEXT;
    END IF;
    
    -- Ajouter oauth_token_expires_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_email_settings' 
        AND column_name = 'oauth_token_expires_at'
    ) THEN
        ALTER TABLE public.user_email_settings ADD COLUMN oauth_token_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3️⃣ Activer RLS
ALTER TABLE public.user_email_settings ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own email settings" ON public.user_email_settings;
DROP POLICY IF EXISTS "Users can insert their own email settings" ON public.user_email_settings;
DROP POLICY IF EXISTS "Users can update their own email settings" ON public.user_email_settings;
DROP POLICY IF EXISTS "Users can delete their own email settings" ON public.user_email_settings;

-- 5️⃣ Créer les policies RLS
CREATE POLICY "Users can view their own email settings"
ON public.user_email_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email settings"
ON public.user_email_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email settings"
ON public.user_email_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email settings"
ON public.user_email_settings
FOR DELETE
USING (auth.uid() = user_id);

-- 6️⃣ Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_email_settings_user_id ON public.user_email_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_settings_provider ON public.user_email_settings(provider);

-- 7️⃣ Créer un trigger pour updated_at
CREATE OR REPLACE FUNCTION update_user_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_email_settings_updated_at ON public.user_email_settings;

CREATE TRIGGER trigger_update_user_email_settings_updated_at
BEFORE UPDATE ON public.user_email_settings
FOR EACH ROW
EXECUTE FUNCTION update_user_email_settings_updated_at();

-- 8️⃣ Vérifier que la table est bien créée
SELECT 
  column_name,
  data_type,
  is_nullable,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_email_settings'
ORDER BY ordinal_position;

-- ✅ Script terminé avec succès !
-- La table user_email_settings est maintenant prête à être utilisée
