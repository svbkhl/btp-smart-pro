-- Créer la table si elle n'existe pas, sinon ajouter les colonnes manquantes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_notification_preferences'
  ) THEN
    -- Création complète de la table avec toutes les colonnes
    CREATE TABLE public.user_notification_preferences (
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
      signed_quote_notifications BOOLEAN DEFAULT true,
      payment_received_notifications BOOLEAN DEFAULT true,
      planning_assignment_notifications BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id
      ON public.user_notification_preferences(user_id);

    ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

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
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_user_notification_preferences_updated_at
      BEFORE UPDATE ON public.user_notification_preferences
      FOR EACH ROW
      EXECUTE PROCEDURE update_user_notification_preferences_updated_at();

    COMMENT ON TABLE public.user_notification_preferences IS 'Préférences de notifications (paramètres > Notifications)';
  ELSE
    -- La table existe : ajouter les colonnes si elles manquent
    ALTER TABLE public.user_notification_preferences
      ADD COLUMN IF NOT EXISTS signed_quote_notifications BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS payment_received_notifications BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS planning_assignment_notifications BOOLEAN DEFAULT true;
  END IF;
END $$;

COMMENT ON COLUMN public.user_notification_preferences.signed_quote_notifications IS 'Responsables : être notifié quand un client signe un devis';
COMMENT ON COLUMN public.user_notification_preferences.payment_received_notifications IS 'Responsables : être notifié quand un paiement est reçu';
COMMENT ON COLUMN public.user_notification_preferences.planning_assignment_notifications IS 'Employés : être notifié lors d''une affectation ou modification de planning';
