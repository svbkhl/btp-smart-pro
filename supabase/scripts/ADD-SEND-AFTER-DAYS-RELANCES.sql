-- Ajoute send_after_days aux tables de relances
-- Factures : jours de retard avant d'envoyer (défaut 7, 15, 30)
-- Devis : jours après envoi avant d'envoyer (défaut 3, 7, 14)
-- À exécuter dans Supabase Dashboard > SQL Editor

ALTER TABLE reminder_templates
  ADD COLUMN IF NOT EXISTS send_after_days INTEGER;

ALTER TABLE quote_reminder_templates
  ADD COLUMN IF NOT EXISTS send_after_days INTEGER;

-- Valeurs par défaut selon le niveau (factures = jours de retard)
UPDATE reminder_templates SET send_after_days = 7 WHERE reminder_level = 1 AND (send_after_days IS NULL OR send_after_days < 1);
UPDATE reminder_templates SET send_after_days = 15 WHERE reminder_level = 2 AND (send_after_days IS NULL OR send_after_days < 1);
UPDATE reminder_templates SET send_after_days = 30 WHERE reminder_level = 3 AND (send_after_days IS NULL OR send_after_days < 1);

-- Valeurs par défaut selon le niveau (devis = jours depuis envoi)
UPDATE quote_reminder_templates SET send_after_days = 3 WHERE reminder_level = 1 AND (send_after_days IS NULL OR send_after_days < 1);
UPDATE quote_reminder_templates SET send_after_days = 7 WHERE reminder_level = 2 AND (send_after_days IS NULL OR send_after_days < 1);
UPDATE quote_reminder_templates SET send_after_days = 14 WHERE reminder_level = 3 AND (send_after_days IS NULL OR send_after_days < 1);

ALTER TABLE reminder_templates ALTER COLUMN send_after_days SET DEFAULT 7;
ALTER TABLE reminder_templates ALTER COLUMN send_after_days SET NOT NULL;
ALTER TABLE quote_reminder_templates ALTER COLUMN send_after_days SET DEFAULT 3;
ALTER TABLE quote_reminder_templates ALTER COLUMN send_after_days SET NOT NULL;
