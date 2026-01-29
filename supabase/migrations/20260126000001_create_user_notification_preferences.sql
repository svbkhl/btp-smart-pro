-- Table des préférences de notifications utilisateur (paramètres > Notifications)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id
  ON public.user_notification_preferences(user_id);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.user_notification_preferences;

CREATE POLICY "Users can view their own notification preferences"
  ON public.user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_user_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER trigger_update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE update_user_notification_preferences_updated_at();

COMMENT ON TABLE public.user_notification_preferences IS 'Préférences de notifications (paramètres > Notifications)';
