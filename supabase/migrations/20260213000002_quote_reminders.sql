-- =====================================================
-- RELANCES DEVIS - Tables pour relancer les devis en attente
-- =====================================================

-- Table pour les templates de relance DEVIS
CREATE TABLE IF NOT EXISTS public.quote_reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reminder_level INTEGER NOT NULL CHECK (reminder_level IN (1, 2, 3)),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, reminder_level)
);

-- Table pour l'historique des relances devis envoyées
CREATE TABLE IF NOT EXISTS public.quote_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES ai_quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  quote_number TEXT NOT NULL,
  quote_amount DECIMAL(10, 2) NOT NULL,
  sent_at_quote TIMESTAMPTZ NOT NULL,
  days_since_sent INTEGER NOT NULL,
  reminder_level INTEGER NOT NULL CHECK (reminder_level IN (1, 2, 3)),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
  email_subject TEXT,
  email_body TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_reminder_templates_company_id ON quote_reminder_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_reminders_company_id ON quote_reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_reminders_quote_id ON quote_reminders(quote_id);

-- RLS
ALTER TABLE quote_reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_company_quote_reminder_templates" ON quote_reminder_templates
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "insert_own_company_quote_reminder_templates" ON quote_reminder_templates
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "update_own_company_quote_reminder_templates" ON quote_reminder_templates
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()))
  WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "delete_own_company_quote_reminder_templates" ON quote_reminder_templates
  FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "select_own_company_quote_reminders" ON quote_reminders
  FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "insert_own_company_quote_reminders" ON quote_reminders
  FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "update_own_company_quote_reminders" ON quote_reminders
  FOR UPDATE USING (company_id IN (SELECT get_my_company_ids()))
  WITH CHECK (company_id IN (SELECT get_my_company_ids()));

CREATE POLICY "delete_own_company_quote_reminders" ON quote_reminders
  FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

-- Vérifier que l'utilisateur a accès à la company
CREATE OR REPLACE FUNCTION get_pending_quotes_for_reminder(p_company_id UUID, p_days INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  amount_ttc NUMERIC,
  sent_at_quote TIMESTAMPTZ,
  days_since_sent INTEGER,
  status TEXT,
  last_reminder_sent_at TIMESTAMPTZ,
  last_reminder_level INTEGER,
  reminder_count BIGINT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_company_id IS NULL OR p_company_id NOT IN (SELECT get_my_company_ids()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    q.id,
    q.quote_number,
    q.client_id,
    q.client_name,
    COALESCE(q.client_email, c.email) as client_email,
    COALESCE(q.total_ttc, q.estimated_cost, 0)::NUMERIC as amount_ttc,
    COALESCE(q.sent_at, q.updated_at)::TIMESTAMPTZ as sent_at_quote,
    (EXTRACT(EPOCH FROM (NOW() - COALESCE(q.sent_at, q.updated_at))) / 86400)::INTEGER as days_since_sent,
    q.status,
    (
      SELECT qr.sent_at FROM quote_reminders qr 
      WHERE qr.quote_id = q.id AND qr.status = 'sent' 
      ORDER BY qr.sent_at DESC LIMIT 1
    ) as last_reminder_sent_at,
    (
      SELECT qr.reminder_level FROM quote_reminders qr 
      WHERE qr.quote_id = q.id AND qr.status = 'sent' 
      ORDER BY qr.sent_at DESC LIMIT 1
    )::INTEGER as last_reminder_level,
    (
      SELECT COUNT(*) FROM quote_reminders qr 
      WHERE qr.quote_id = q.id AND qr.status = 'sent'
    )::BIGINT as reminder_count
  FROM ai_quotes q
  LEFT JOIN clients c ON c.id = q.client_id
  WHERE q.company_id = p_company_id
    AND (q.signed_at IS NULL AND (q.status IS NULL OR q.status NOT IN ('signed', 'accepted', 'rejected')))
    AND (q.sent_at IS NOT NULL OR q.updated_at IS NOT NULL)
    AND COALESCE(q.sent_at, q.updated_at)::DATE <= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
  ORDER BY COALESCE(q.sent_at, q.updated_at) ASC;
END;
$$;

-- Triggers updated_at
CREATE TRIGGER trigger_update_quote_reminder_templates_updated_at
  BEFORE UPDATE ON quote_reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_templates_updated_at();

CREATE OR REPLACE FUNCTION update_quote_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_reminders_updated_at
  BEFORE UPDATE ON quote_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_reminders_updated_at();

-- Templates par défaut pour relances DEVIS
INSERT INTO quote_reminder_templates (company_id, reminder_level, subject, body, is_active)
SELECT 
  c.id,
  1,
  'Rappel : Devis {{quote_number}} en attente',
  'Bonjour {{client_name}},

Nous vous avons transmis notre devis {{quote_number}} d''un montant de {{amount}}€, envoyé il y a {{days_since_sent}} jours.

Nous restons à votre disposition pour toute question ou pour convenir d''un rendez-vous afin de finaliser ce projet.

Cordialement,',
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM quote_reminder_templates qrt 
  WHERE qrt.company_id = c.id AND qrt.reminder_level = 1
);

INSERT INTO quote_reminder_templates (company_id, reminder_level, subject, body, is_active)
SELECT 
  c.id,
  2,
  'Rappel : Devis {{quote_number}} - Suite à notre envoi',
  'Bonjour {{client_name}},

Nous revenons vers vous concernant notre devis {{quote_number}} ({{amount}}€), transmis il y a {{days_since_sent}} jours.

Avez-vous pu prendre connaissance de notre proposition ? Nous restons disponibles pour en discuter et répondre à vos questions.

Cordialement,',
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM quote_reminder_templates qrt 
  WHERE qrt.company_id = c.id AND qrt.reminder_level = 2
);

INSERT INTO quote_reminder_templates (company_id, reminder_level, subject, body, is_active)
SELECT 
  c.id,
  3,
  'Dernier rappel : Devis {{quote_number}}',
  'Bonjour {{client_name}},

Malgré nos précédents rappels, nous n''avons pas reçu de retour concernant notre devis {{quote_number}} ({{amount}}€), envoyé il y a {{days_since_sent}} jours.

Souhaitez-vous que nous maintenions cette proposition à disposition ou préférez-vous la laisser expirer ?

Nous restons à votre écoute.

Cordialement,',
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM quote_reminder_templates qrt 
  WHERE qrt.company_id = c.id AND qrt.reminder_level = 3
);
