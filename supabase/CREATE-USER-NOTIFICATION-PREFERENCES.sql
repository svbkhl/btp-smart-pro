-- ============================================
-- CRÉATION TABLE: user_notification_preferences
-- ============================================
-- Table pour stocker les préférences de notifications des utilisateurs
-- ============================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  quote_reminders BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  project_reminders BOOLEAN DEFAULT true,
  maintenance_reminders BOOLEAN DEFAULT true,
  quote_reminder_days INTEGER DEFAULT 3,
  payment_reminder_days INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id 
  ON public.user_notification_preferences(user_id);

-- Activer RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own notification preferences" 
  ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" 
  ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" 
  ON public.user_notification_preferences;

-- Politique : Les utilisateurs peuvent voir leurs propres préférences
CREATE POLICY "Users can view their own notification preferences"
  ON public.user_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent insérer leurs propres préférences
CREATE POLICY "Users can insert their own notification preferences"
  ON public.user_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent mettre à jour leurs propres préférences
CREATE POLICY "Users can update their own notification preferences"
  ON public.user_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_notification_preferences_updated_at 
  ON public.user_notification_preferences;

CREATE TRIGGER trigger_update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notification_preferences_updated_at();

-- Commentaires
COMMENT ON TABLE public.user_notification_preferences IS 
  'Préférences de notifications des utilisateurs';
COMMENT ON COLUMN public.user_notification_preferences.email_notifications IS 
  'Activer/désactiver les notifications par email';
COMMENT ON COLUMN public.user_notification_preferences.push_notifications IS 
  'Activer/désactiver les notifications push du navigateur';
COMMENT ON COLUMN public.user_notification_preferences.quote_reminder_days IS 
  'Nombre de jours avant de rappeler un devis en attente';
COMMENT ON COLUMN public.user_notification_preferences.payment_reminder_days IS 
  'Nombre de jours avant l''échéance pour rappeler un paiement';

-- Vérification
SELECT '✅ Table user_notification_preferences créée avec succès !' AS result;
