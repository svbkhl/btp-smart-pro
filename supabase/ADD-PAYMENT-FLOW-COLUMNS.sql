-- =====================================================
-- SYSTÈME COMPLET DE PAIEMENT STRIPE
-- =====================================================
-- Ajoute toutes les colonnes nécessaires pour le flow:
-- Signature → Facture → Paiement Stripe → Webhook
-- =====================================================

-- =====================================================
-- 1️⃣ TABLE INVOICES (Factures)
-- =====================================================

DO $$
BEGIN
  -- Vérifier si la table invoices existe, sinon la créer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoices'
  ) THEN
    CREATE TABLE public.invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL,
      invoice_number TEXT,
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'draft',
      due_date DATE,
      paid_date DATE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    RAISE NOTICE '✅ Table invoices créée';
  ELSE
    RAISE NOTICE 'ℹ️ Table invoices existe déjà';
  END IF;
END $$;

-- Ajouter les colonnes manquantes à invoices
DO $$
BEGIN
  -- quote_id (lien vers le devis)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Colonne quote_id ajoutée à invoices';
  END IF;

  -- client_name (nom du client pour facture)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_name'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN client_name TEXT;
    RAISE NOTICE '✅ Colonne client_name ajoutée à invoices';
  END IF;

  -- client_email (email du client)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN client_email TEXT;
    RAISE NOTICE '✅ Colonne client_email ajoutée à invoices';
  END IF;

  -- total_ht (montant HT)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'total_ht'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN total_ht NUMERIC;
    RAISE NOTICE '✅ Colonne total_ht ajoutée à invoices';
  END IF;

  -- total_ttc (montant TTC)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'total_ttc'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN total_ttc NUMERIC;
    RAISE NOTICE '✅ Colonne total_ttc ajoutée à invoices';
  END IF;

  -- tva (montant TVA)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'tva'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN tva NUMERIC;
    RAISE NOTICE '✅ Colonne tva ajoutée à invoices';
  END IF;

  -- amount_paid (montant déjà payé)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN amount_paid NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Colonne amount_paid ajoutée à invoices';
  END IF;

  -- amount_remaining (montant restant à payer)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_remaining'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN amount_remaining NUMERIC;
    RAISE NOTICE '✅ Colonne amount_remaining ajoutée à invoices';
  END IF;

  -- pdf_url (lien vers le PDF de la facture)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN pdf_url TEXT;
    RAISE NOTICE '✅ Colonne pdf_url ajoutée à invoices';
  END IF;

  -- notes (notes internes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ Colonne notes ajoutée à invoices';
  END IF;
END $$;

-- Supprimer et recréer la contrainte CHECK sur status
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'));

-- =====================================================
-- 2️⃣ TABLE PAYMENTS (Paiements)
-- =====================================================

DO $$
BEGIN
  -- Vérifier si la table payments existe, sinon la créer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    CREATE TABLE public.payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
      invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
      quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL,
      amount NUMERIC NOT NULL,
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      paid_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    RAISE NOTICE '✅ Table payments créée';
  ELSE
    RAISE NOTICE 'ℹ️ Table payments existe déjà';
  END IF;
END $$;

-- Ajouter les colonnes Stripe à payments
DO $$
BEGIN
  -- quote_id (lien vers le devis)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Colonne quote_id ajoutée à payments';
  END IF;

  -- client_id (lien vers le client)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Colonne client_id ajoutée à payments';
  END IF;

  -- stripe_session_id (ID de la Checkout Session)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN stripe_session_id TEXT UNIQUE;
    RAISE NOTICE '✅ Colonne stripe_session_id ajoutée à payments';
  END IF;

  -- stripe_payment_intent_id (ID du Payment Intent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN stripe_payment_intent_id TEXT;
    RAISE NOTICE '✅ Colonne stripe_payment_intent_id ajoutée à payments';
  END IF;

  -- payment_link (lien Stripe Checkout)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_link'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN payment_link TEXT;
    RAISE NOTICE '✅ Colonne payment_link ajoutée à payments';
  END IF;

  -- payment_type (total ou acompte)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN payment_type TEXT CHECK (payment_type IN ('total', 'deposit', 'partial'));
    RAISE NOTICE '✅ Colonne payment_type ajoutée à payments';
  END IF;

  -- currency (devise)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN currency TEXT DEFAULT 'EUR';
    RAISE NOTICE '✅ Colonne currency ajoutée à payments';
  END IF;

  -- reference (référence paiement)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'reference'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN reference TEXT;
    RAISE NOTICE '✅ Colonne reference ajoutée à payments';
  END IF;

  -- notes (notes internes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ Colonne notes ajoutée à payments';
  END IF;

  -- webhook_received_at (date réception webhook)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'webhook_received_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN webhook_received_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne webhook_received_at ajoutée à payments';
  END IF;
END $$;

-- Supprimer et recréer la contrainte CHECK sur status
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'));

-- =====================================================
-- 3️⃣ INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON public.invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON public.payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- =====================================================
-- 4️⃣ RLS POLICIES (sécurité)
-- =====================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Invoices policies
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
CREATE POLICY "Users can insert their own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update their own payments"
  ON public.payments FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5️⃣ COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.invoices IS 'Factures générées à partir des devis signés';
COMMENT ON TABLE public.payments IS 'Paiements Stripe liés aux factures';

COMMENT ON COLUMN public.invoices.quote_id IS 'Lien vers le devis d''origine';
COMMENT ON COLUMN public.invoices.amount_paid IS 'Montant déjà payé (acomptes)';
COMMENT ON COLUMN public.invoices.amount_remaining IS 'Montant restant à payer';
COMMENT ON COLUMN public.invoices.status IS 'draft, sent, partially_paid, paid, overdue, cancelled';

COMMENT ON COLUMN public.payments.stripe_session_id IS 'ID Stripe Checkout Session';
COMMENT ON COLUMN public.payments.payment_type IS 'total (paiement complet) ou deposit (acompte) ou partial (paiement partiel)';
COMMENT ON COLUMN public.payments.payment_link IS 'URL Stripe Checkout envoyée au client';

-- =====================================================
-- 6️⃣ FONCTION: Calculer le montant restant
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_invoice_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer le montant restant
  UPDATE public.invoices
  SET 
    amount_remaining = amount - COALESCE(amount_paid, 0),
    status = CASE
      WHEN COALESCE(amount_paid, 0) >= amount THEN 'paid'
      WHEN COALESCE(amount_paid, 0) > 0 THEN 'partially_paid'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Mettre à jour facture quand un paiement est complété
DROP TRIGGER IF EXISTS trigger_update_invoice_on_payment ON public.payments;
CREATE TRIGGER trigger_update_invoice_on_payment
  AFTER INSERT OR UPDATE OF status, amount ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_invoice_remaining_amount();

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SYSTÈME DE PAIEMENT STRIPE CONFIGURÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables: invoices, payments';
  RAISE NOTICE 'Colonnes Stripe ajoutées';
  RAISE NOTICE 'RLS activé';
  RAISE NOTICE 'Trigger auto-update facture créé';
  RAISE NOTICE '========================================';
END $$;
