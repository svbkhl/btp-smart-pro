-- =====================================================
-- TABLE: user_email_settings
-- =====================================================
-- Stocke les paramètres de configuration email pour chaque utilisateur
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'resend', -- 'gmail', 'outlook', 'resend', 'smtp'
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT, -- Stocké en clair (à chiffrer en production)
  from_email TEXT,
  from_name TEXT,
  oauth_access_token TEXT, -- Pour OAuth Gmail/Outlook
  oauth_refresh_token TEXT, -- Pour OAuth Gmail/Outlook
  oauth_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_email_settings_user_id ON public.user_email_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_settings_provider ON public.user_email_settings(provider);

-- Activer RLS
ALTER TABLE public.user_email_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own email settings" ON public.user_email_settings;
DROP POLICY IF EXISTS "Users can create their own email settings" ON public.user_email_settings;
DROP POLICY IF EXISTS "Users can update their own email settings" ON public.user_email_settings;
DROP POLICY IF EXISTS "Users can delete their own email settings" ON public.user_email_settings;

-- Policies RLS
CREATE POLICY "Users can view their own email settings"
  ON public.user_email_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email settings"
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

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_user_email_settings_updated_at()
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
  EXECUTE FUNCTION public.update_user_email_settings_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE public.user_email_settings IS 'Paramètres de configuration email pour chaque utilisateur';
COMMENT ON COLUMN public.user_email_settings.provider IS 'Type de fournisseur email: gmail, outlook, resend, smtp';
COMMENT ON COLUMN public.user_email_settings.smtp_password IS 'Mot de passe SMTP ou App Password (à chiffrer en production)';
COMMENT ON COLUMN public.user_email_settings.oauth_access_token IS 'Token OAuth pour Gmail/Outlook (à chiffrer en production)';
COMMENT ON COLUMN public.user_email_settings.oauth_refresh_token IS 'Refresh token OAuth pour Gmail/Outlook (à chiffrer en production)';




