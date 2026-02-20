-- =====================================================
-- SCRIPT RELANCES - À exécuter dans Supabase Dashboard > SQL Editor
-- Crée les tables reminder_templates, payment_reminders, quote_reminder_templates, quote_reminders
-- =====================================================

-- 1. TABLES FACTURES (reminder_templates + payment_reminders)
CREATE TABLE IF NOT EXISTS public.reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reminder_level INTEGER NOT NULL CHECK (reminder_level IN (1, 2, 3)),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  send_after_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, reminder_level)
);

CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  invoice_number TEXT NOT NULL,
  invoice_amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  days_overdue INTEGER NOT NULL,
  reminder_level INTEGER NOT NULL CHECK (reminder_level IN (1, 2, 3)),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
  email_subject TEXT,
  email_body TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_templates_company_id ON reminder_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_company_id ON payment_reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice_id ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(company_id, sent_at DESC);

ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_company_reminder_templates" ON reminder_templates;
DROP POLICY IF EXISTS "insert_own_company_reminder_templates" ON reminder_templates;
DROP POLICY IF EXISTS "update_own_company_reminder_templates" ON reminder_templates;
DROP POLICY IF EXISTS "delete_own_company_reminder_templates" ON reminder_templates;
CREATE POLICY "select_own_company_reminder_templates" ON reminder_templates FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "insert_own_company_reminder_templates" ON reminder_templates FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "update_own_company_reminder_templates" ON reminder_templates FOR UPDATE USING (company_id IN (SELECT get_my_company_ids())) WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "delete_own_company_reminder_templates" ON reminder_templates FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

DROP POLICY IF EXISTS "select_own_company_payment_reminders" ON payment_reminders;
DROP POLICY IF EXISTS "insert_own_company_payment_reminders" ON payment_reminders;
DROP POLICY IF EXISTS "update_own_company_payment_reminders" ON payment_reminders;
DROP POLICY IF EXISTS "delete_own_company_payment_reminders" ON payment_reminders;
CREATE POLICY "select_own_company_payment_reminders" ON payment_reminders FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "insert_own_company_payment_reminders" ON payment_reminders FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "update_own_company_payment_reminders" ON payment_reminders FOR UPDATE USING (company_id IN (SELECT get_my_company_ids())) WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "delete_own_company_payment_reminders" ON payment_reminders FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

CREATE OR REPLACE FUNCTION update_reminder_templates_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reminder_templates_updated_at ON reminder_templates;
CREATE TRIGGER trigger_update_reminder_templates_updated_at BEFORE UPDATE ON reminder_templates FOR EACH ROW EXECUTE FUNCTION update_reminder_templates_updated_at();

CREATE OR REPLACE FUNCTION update_payment_reminders_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_reminders_updated_at ON payment_reminders;
CREATE TRIGGER trigger_update_payment_reminders_updated_at BEFORE UPDATE ON payment_reminders FOR EACH ROW EXECUTE FUNCTION update_payment_reminders_updated_at();

CREATE OR REPLACE FUNCTION get_overdue_invoices()
RETURNS TABLE (id UUID, invoice_number TEXT, client_id UUID, client_name TEXT, client_email TEXT, amount_ttc DECIMAL, due_date DATE, days_overdue INTEGER, status TEXT, payment_status TEXT, last_reminder_sent_at TIMESTAMPTZ, last_reminder_level INTEGER, reminder_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.invoice_number, i.client_id, i.client_name, i.client_email,
    COALESCE(i.total_ttc, i.amount)::DECIMAL, i.due_date::DATE,
    (CURRENT_DATE - i.due_date::DATE)::INTEGER, i.status::TEXT, i.payment_status::TEXT,
    (SELECT pr.sent_at FROM payment_reminders pr WHERE pr.invoice_id = i.id AND pr.status = 'sent' ORDER BY pr.sent_at DESC LIMIT 1),
    (SELECT pr.reminder_level FROM payment_reminders pr WHERE pr.invoice_id = i.id AND pr.status = 'sent' ORDER BY pr.sent_at DESC LIMIT 1)::INTEGER,
    (SELECT COUNT(*)::BIGINT FROM payment_reminders pr WHERE pr.invoice_id = i.id AND pr.status = 'sent')
  FROM invoices i
  WHERE i.company_id IN (SELECT get_my_company_ids())
    AND i.due_date IS NOT NULL AND i.due_date::DATE < CURRENT_DATE
    AND (i.payment_status IS NULL OR i.payment_status != 'paid')
    AND (i.status IS NULL OR i.status != 'cancelled')
  ORDER BY i.due_date ASC;
END; $$;

INSERT INTO reminder_templates (company_id, reminder_level, subject, body, is_active, send_after_days)
SELECT c.id, 1, 'Rappel : Facture {{invoice_number}} échue',
  'Bonjour {{client_name}},

Nous vous remercions pour votre confiance.

Nous constatons que votre facture {{invoice_number}} d''un montant de {{amount}}€, échue depuis {{days_overdue}} jours (date d''échéance : {{due_date}}), n''a pas encore été réglée.

S''il s''agit d''un oubli de votre part, nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Si vous avez déjà effectué le paiement, veuillez ne pas tenir compte de ce message.

Cordialement,', true, 7
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM reminder_templates rt WHERE rt.company_id = c.id AND rt.reminder_level = 1);

INSERT INTO reminder_templates (company_id, reminder_level, subject, body, is_active, send_after_days)
SELECT c.id, 2, 'Rappel urgent : Facture {{invoice_number}} impayée',
  'Bonjour {{client_name}},

Nous vous avions adressé un premier rappel concernant votre facture {{invoice_number}} d''un montant de {{amount}}€.

À ce jour, celle-ci reste impayée malgré un retard de {{days_overdue}} jours.

Nous vous demandons de bien vouloir régulariser cette situation dans les 7 jours suivant la réception de ce message.

Si vous rencontrez des difficultés pour le règlement, nous vous invitons à nous contacter rapidement afin de trouver une solution.

Cordialement,', true, 15
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM reminder_templates rt WHERE rt.company_id = c.id AND rt.reminder_level = 2);

INSERT INTO reminder_templates (company_id, reminder_level, subject, body, is_active, send_after_days)
SELECT c.id, 3, 'Mise en demeure : Facture {{invoice_number}}',
  'Bonjour {{client_name}},

Malgré nos précédents rappels, votre facture {{invoice_number}} d''un montant de {{amount}}€ demeure impayée depuis {{days_overdue}} jours.

Cette situation nous contraint à vous adresser une mise en demeure de régler cette somme sous 8 jours à compter de la réception de ce courrier.

À défaut de règlement dans ce délai, nous serons dans l''obligation d''engager une procédure de recouvrement contentieux, sans autre avis préalable.

Nous espérons que cette issue ne sera pas nécessaire et comptons sur votre diligence.

Cordialement,', true, 30
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM reminder_templates rt WHERE rt.company_id = c.id AND rt.reminder_level = 3);

-- 2. TABLES DEVIS (quote_reminder_templates + quote_reminders)
CREATE TABLE IF NOT EXISTS public.quote_reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reminder_level INTEGER NOT NULL CHECK (reminder_level IN (1, 2, 3)),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  send_after_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, reminder_level)
);

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

ALTER TABLE quote_reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_company_quote_reminder_templates" ON quote_reminder_templates;
DROP POLICY IF EXISTS "insert_own_company_quote_reminder_templates" ON quote_reminder_templates;
DROP POLICY IF EXISTS "update_own_company_quote_reminder_templates" ON quote_reminder_templates;
DROP POLICY IF EXISTS "delete_own_company_quote_reminder_templates" ON quote_reminder_templates;
CREATE POLICY "select_own_company_quote_reminder_templates" ON quote_reminder_templates FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "insert_own_company_quote_reminder_templates" ON quote_reminder_templates FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "update_own_company_quote_reminder_templates" ON quote_reminder_templates FOR UPDATE USING (company_id IN (SELECT get_my_company_ids())) WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "delete_own_company_quote_reminder_templates" ON quote_reminder_templates FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

DROP POLICY IF EXISTS "select_own_company_quote_reminders" ON quote_reminders;
DROP POLICY IF EXISTS "insert_own_company_quote_reminders" ON quote_reminders;
DROP POLICY IF EXISTS "update_own_company_quote_reminders" ON quote_reminders;
DROP POLICY IF EXISTS "delete_own_company_quote_reminders" ON quote_reminders;
CREATE POLICY "select_own_company_quote_reminders" ON quote_reminders FOR SELECT USING (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "insert_own_company_quote_reminders" ON quote_reminders FOR INSERT WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "update_own_company_quote_reminders" ON quote_reminders FOR UPDATE USING (company_id IN (SELECT get_my_company_ids())) WITH CHECK (company_id IN (SELECT get_my_company_ids()));
CREATE POLICY "delete_own_company_quote_reminders" ON quote_reminders FOR DELETE USING (company_id IN (SELECT get_my_company_ids()));

DROP TRIGGER IF EXISTS trigger_update_quote_reminder_templates_updated_at ON quote_reminder_templates;
CREATE TRIGGER trigger_update_quote_reminder_templates_updated_at BEFORE UPDATE ON quote_reminder_templates FOR EACH ROW EXECUTE FUNCTION update_reminder_templates_updated_at();

CREATE OR REPLACE FUNCTION update_quote_reminders_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quote_reminders_updated_at ON quote_reminders;
CREATE TRIGGER trigger_update_quote_reminders_updated_at BEFORE UPDATE ON quote_reminders FOR EACH ROW EXECUTE FUNCTION update_quote_reminders_updated_at();

CREATE OR REPLACE FUNCTION get_pending_quotes_for_reminder(p_company_id UUID, p_days INTEGER DEFAULT 3)
RETURNS TABLE (id UUID, quote_number TEXT, client_id UUID, client_name TEXT, client_email TEXT, amount_ttc NUMERIC, sent_at_quote TIMESTAMPTZ, days_since_sent INTEGER, status TEXT, last_reminder_sent_at TIMESTAMPTZ, last_reminder_level INTEGER, reminder_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_company_id IS NULL OR p_company_id NOT IN (SELECT get_my_company_ids()) THEN RETURN; END IF;
  RETURN QUERY
  SELECT q.id, q.quote_number, q.client_id, q.client_name, COALESCE(q.client_email, c.email),
    COALESCE(q.total_ttc, q.estimated_cost, 0)::NUMERIC, COALESCE(q.sent_at, q.updated_at)::TIMESTAMPTZ,
    (EXTRACT(EPOCH FROM (NOW() - COALESCE(q.sent_at, q.updated_at))) / 86400)::INTEGER, q.status,
    (SELECT qr.sent_at FROM quote_reminders qr WHERE qr.quote_id = q.id AND qr.status = 'sent' ORDER BY qr.sent_at DESC LIMIT 1),
    (SELECT qr.reminder_level FROM quote_reminders qr WHERE qr.quote_id = q.id AND qr.status = 'sent' ORDER BY qr.sent_at DESC LIMIT 1)::INTEGER,
    (SELECT COUNT(*) FROM quote_reminders qr WHERE qr.quote_id = q.id AND qr.status = 'sent')::BIGINT
  FROM ai_quotes q LEFT JOIN clients c ON c.id = q.client_id
  WHERE q.company_id = p_company_id
    AND (q.signed_at IS NULL AND (q.status IS NULL OR q.status NOT IN ('signed', 'accepted', 'rejected')))
    AND (q.sent_at IS NOT NULL OR q.updated_at IS NOT NULL)
    AND COALESCE(q.sent_at, q.updated_at)::DATE <= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
  ORDER BY COALESCE(q.sent_at, q.updated_at) ASC;
END; $$;

INSERT INTO quote_reminder_templates (company_id, reminder_level, subject, body, is_active, send_after_days)
SELECT c.id, 1, 'Rappel : Devis {{quote_number}} en attente',
  'Bonjour {{client_name}},

Nous vous avons transmis notre devis {{quote_number}} d''un montant de {{amount}}€ il y a {{days_since_sent}} jours.

Avez-vous pu en prendre connaissance ? Nous restons à votre disposition pour toute question, visite sur site ou ajustement de notre proposition.

N''hésitez pas à nous contacter pour convenir d''un rendez-vous si nécessaire.

Cordialement,', true, 3
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM quote_reminder_templates qrt WHERE qrt.company_id = c.id AND qrt.reminder_level = 1);

INSERT INTO quote_reminder_templates (company_id, reminder_level, subject, body, is_active, send_after_days)
SELECT c.id, 2, 'Rappel : Devis {{quote_number}} — Suite à notre proposition',
  'Bonjour {{client_name}},

Nous revenons vers vous concernant notre devis {{quote_number}} ({{amount}}€), transmis il y a {{days_since_sent}} jours.

Nous n''avons pas reçu de retour de votre part. Notre proposition reste valable, mais nous devons avancer sur la planification de nos chantiers.

Pouvez-vous nous indiquer si notre offre vous convient, ou si vous souhaitez la modifier ? Nous sommes disponibles pour en discuter et adapter notre proposition à vos besoins.

Dans l''attente de votre retour,

Cordialement,', true, 7
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM quote_reminder_templates qrt WHERE qrt.company_id = c.id AND qrt.reminder_level = 2);

INSERT INTO quote_reminder_templates (company_id, reminder_level, subject, body, is_active, send_after_days)
SELECT c.id, 3, 'Dernier rappel : Devis {{quote_number}} — Clôture de notre proposition',
  'Bonjour {{client_name}},

Malgré nos deux précédents rappels, nous n''avons reçu aucune réponse concernant notre devis {{quote_number}} ({{amount}}€), envoyé il y a {{days_since_sent}} jours.

Faute de retour de votre part sous 8 jours, nous considérerons que vous renoncez à notre proposition. Nous serons alors contraints de libérer le créneau réservé pour ce projet et de réaffecter nos équipes.

Si ce projet vous intéresse toujours, merci de nous contacter rapidement.

Cordialement,', true, 14
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM quote_reminder_templates qrt WHERE qrt.company_id = c.id AND qrt.reminder_level = 3);
