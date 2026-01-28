-- Table pour les templates de relances clients
CREATE TABLE IF NOT EXISTS reminder_templates (
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

-- Table pour l'historique des relances envoyées
CREATE TABLE IF NOT EXISTS payment_reminders (
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

-- Index pour améliorer les performances
CREATE INDEX idx_reminder_templates_company_id ON reminder_templates(company_id);
CREATE INDEX idx_payment_reminders_company_id ON payment_reminders(company_id);
CREATE INDEX idx_payment_reminders_invoice_id ON payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(company_id, status);
CREATE INDEX idx_payment_reminders_sent_at ON payment_reminders(company_id, sent_at DESC);

-- RLS Policies pour reminder_templates
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_company_reminder_templates" ON reminder_templates
  FOR SELECT USING (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "insert_own_company_reminder_templates" ON reminder_templates
  FOR INSERT WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "update_own_company_reminder_templates" ON reminder_templates
  FOR UPDATE USING (company_id = (auth.jwt()->>'company_id')::uuid)
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "delete_own_company_reminder_templates" ON reminder_templates
  FOR DELETE USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- RLS Policies pour payment_reminders
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_company_payment_reminders" ON payment_reminders
  FOR SELECT USING (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "insert_own_company_payment_reminders" ON payment_reminders
  FOR INSERT WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "update_own_company_payment_reminders" ON payment_reminders
  FOR UPDATE USING (company_id = (auth.jwt()->>'company_id')::uuid)
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "delete_own_company_payment_reminders" ON payment_reminders
  FOR DELETE USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- Triggers pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_reminder_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reminder_templates_updated_at
  BEFORE UPDATE ON reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_templates_updated_at();

CREATE OR REPLACE FUNCTION update_payment_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_reminders_updated_at
  BEFORE UPDATE ON payment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_reminders_updated_at();

-- Triggers pour forcer company_id depuis le JWT
CREATE OR REPLACE FUNCTION enforce_reminder_templates_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id := (auth.jwt()->>'company_id')::uuid;
  
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id missing in JWT';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_reminder_templates_company_id_trigger
  BEFORE INSERT ON reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION enforce_reminder_templates_company_id();

CREATE OR REPLACE FUNCTION enforce_payment_reminders_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id := (auth.jwt()->>'company_id')::uuid;
  
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id missing in JWT';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_payment_reminders_company_id_trigger
  BEFORE INSERT ON payment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION enforce_payment_reminders_company_id();

-- Fonction pour obtenir les factures impayées et en retard
CREATE OR REPLACE FUNCTION get_overdue_invoices()
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  amount_ttc DECIMAL,
  due_date DATE,
  days_overdue INTEGER,
  status TEXT,
  payment_status TEXT,
  last_reminder_sent_at TIMESTAMPTZ,
  last_reminder_level INTEGER,
  reminder_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    i.client_id,
    i.client_name,
    i.client_email,
    COALESCE(i.total_ttc, i.amount) as amount_ttc,
    i.due_date::DATE,
    (CURRENT_DATE - i.due_date::DATE)::INTEGER as days_overdue,
    i.status,
    i.payment_status,
    (
      SELECT pr.sent_at
      FROM payment_reminders pr
      WHERE pr.invoice_id = i.id
        AND pr.status = 'sent'
      ORDER BY pr.sent_at DESC
      LIMIT 1
    ) as last_reminder_sent_at,
    (
      SELECT pr.reminder_level
      FROM payment_reminders pr
      WHERE pr.invoice_id = i.id
        AND pr.status = 'sent'
      ORDER BY pr.sent_at DESC
      LIMIT 1
    ) as last_reminder_level,
    (
      SELECT COUNT(*)
      FROM payment_reminders pr
      WHERE pr.invoice_id = i.id
        AND pr.status = 'sent'
    ) as reminder_count
  FROM invoices i
  WHERE i.company_id = (auth.jwt()->>'company_id')::uuid
    AND i.due_date IS NOT NULL
    AND i.due_date::DATE < CURRENT_DATE
    AND (i.payment_status IS NULL OR i.payment_status != 'paid')
    AND (i.status != 'cancelled' OR i.status IS NULL)
  ORDER BY i.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insérer des templates par défaut pour chaque entreprise existante
INSERT INTO reminder_templates (company_id, reminder_level, subject, body, is_active)
SELECT 
  c.id as company_id,
  1 as reminder_level,
  'Rappel : Facture {{invoice_number}} échue' as subject,
  'Bonjour {{client_name}},

Nous vous remercions pour votre confiance.

Nous constatons que votre facture {{invoice_number}} d''un montant de {{amount}}€, échue depuis {{days_overdue}} jours (date d''échéance : {{due_date}}), n''a pas encore été réglée.

S''il s''agit d''un oubli de votre part, nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Si vous avez déjà effectué le paiement, veuillez ne pas tenir compte de ce message.

Cordialement,' as body,
  true as is_active
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates rt 
  WHERE rt.company_id = c.id AND rt.reminder_level = 1
);

INSERT INTO reminder_templates (company_id, reminder_level, subject, body, is_active)
SELECT 
  c.id as company_id,
  2 as reminder_level,
  'Rappel urgent : Facture {{invoice_number}} impayée' as subject,
  'Bonjour {{client_name}},

Nous vous avions adressé un premier rappel concernant votre facture {{invoice_number}} d''un montant de {{amount}}€.

À ce jour, celle-ci reste impayée malgré un retard de {{days_overdue}} jours.

Nous vous demandons de bien vouloir régulariser cette situation dans les 7 jours suivant la réception de ce message.

Si vous rencontrez des difficultés pour le règlement, nous vous invitons à nous contacter rapidement afin de trouver une solution.

Cordialement,' as body,
  true as is_active
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates rt 
  WHERE rt.company_id = c.id AND rt.reminder_level = 2
);

INSERT INTO reminder_templates (company_id, reminder_level, subject, body, is_active)
SELECT 
  c.id as company_id,
  3 as reminder_level,
  'Mise en demeure : Facture {{invoice_number}}' as subject,
  'Bonjour {{client_name}},

Malgré nos précédents rappels, votre facture {{invoice_number}} d''un montant de {{amount}}€ demeure impayée depuis {{days_overdue}} jours.

Cette situation nous contraint à vous adresser une mise en demeure de régler cette somme sous 8 jours à compter de la réception de ce courrier.

À défaut de règlement dans ce délai, nous serons dans l''obligation d''engager une procédure de recouvrement contentieux, sans autre avis préalable.

Nous espérons que cette issue ne sera pas nécessaire et comptons sur votre diligence.

Cordialement,' as body,
  true as is_active
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates rt 
  WHERE rt.company_id = c.id AND rt.reminder_level = 3
);
