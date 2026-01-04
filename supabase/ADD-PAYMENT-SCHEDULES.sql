-- =====================================================
-- SYSTÈME DE PAIEMENT EN PLUSIEURS FOIS
-- =====================================================
-- Ajoute la table payment_schedules pour gérer les échéances
-- et les modifications nécessaires aux tables existantes
-- =====================================================

-- =====================================================
-- 1️⃣ TABLE payment_schedules (Échéancier)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL,
  
  -- Informations échéance
  installment_number INTEGER NOT NULL CHECK (installment_number > 0), -- Numéro de l'échéance (1, 2, 3...)
  total_installments INTEGER NOT NULL CHECK (total_installments > 0), -- Nombre total d'échéances
  amount NUMERIC NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'overdue', 'cancelled')),
  
  -- Stripe
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  payment_link TEXT,
  
  -- Dates
  paid_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE, -- Date d'envoi du lien
  reminder_sent_at TIMESTAMP WITH TIME ZONE, -- Date d'envoi du rappel
  
  -- Métadonnées
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT unique_installment_per_invoice UNIQUE (invoice_id, installment_number)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_payment_schedules_invoice_id ON public.payment_schedules(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_user_id ON public.payment_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON public.payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON public.payment_schedules(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_schedules_stripe_session_id ON public.payment_schedules(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- =====================================================
-- 2️⃣ MODIFIER TABLE invoices
-- =====================================================

DO $$
BEGIN
  -- payment_plan_type (type de plan de paiement)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'payment_plan_type'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN payment_plan_type TEXT CHECK (payment_plan_type IN ('single', 'deposit', 'installments'));
    RAISE NOTICE '✅ Colonne payment_plan_type ajoutée à invoices';
  END IF;

  -- installments_count (nombre d'échéances si paiement fractionné)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'installments_count'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN installments_count INTEGER;
    RAISE NOTICE '✅ Colonne installments_count ajoutée à invoices';
  END IF;

  -- installments_paid (nombre d'échéances payées)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'installments_paid'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN installments_paid INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Colonne installments_paid ajoutée à invoices';
  END IF;
END $$;

-- =====================================================
-- 3️⃣ MODIFIER TABLE payments
-- =====================================================

DO $$
BEGIN
  -- schedule_id (lien vers l'échéance si paiement fractionné)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'schedule_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Colonne schedule_id ajoutée à payments';
  END IF;

  -- installment_number (numéro de l'échéance)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'installment_number'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN installment_number INTEGER;
    RAISE NOTICE '✅ Colonne installment_number ajoutée à payments';
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_payments_schedule_id ON public.payments(schedule_id) WHERE schedule_id IS NOT NULL;

-- =====================================================
-- 4️⃣ RLS POLICIES
-- =====================================================

ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "Users can view their own schedules" ON public.payment_schedules;
CREATE POLICY "Users can view their own schedules"
  ON public.payment_schedules FOR SELECT
  USING (auth.uid() = user_id);

-- Insert policy
DROP POLICY IF EXISTS "Users can insert their own schedules" ON public.payment_schedules;
CREATE POLICY "Users can insert their own schedules"
  ON public.payment_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update policy
DROP POLICY IF EXISTS "Users can update their own schedules" ON public.payment_schedules;
CREATE POLICY "Users can update their own schedules"
  ON public.payment_schedules FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete policy
DROP POLICY IF EXISTS "Users can delete their own schedules" ON public.payment_schedules;
CREATE POLICY "Users can delete their own schedules"
  ON public.payment_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5️⃣ FONCTION: Calculer prochaine échéance impayée
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_next_unpaid_installment(p_invoice_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_installment INTEGER;
BEGIN
  SELECT MIN(installment_number) INTO next_installment
  FROM public.payment_schedules
  WHERE invoice_id = p_invoice_id
  AND status = 'pending'
  ORDER BY installment_number;
  
  RETURN COALESCE(next_installment, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6️⃣ FONCTION: Vérifier si échéance précédente payée
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_previous_installment_paid(
  p_invoice_id UUID,
  p_installment_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  unpaid_count INTEGER;
BEGIN
  -- Si c'est la première échéance, toujours autorisée
  IF p_installment_number = 1 THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier si toutes les échéances précédentes sont payées
  SELECT COUNT(*) INTO unpaid_count
  FROM public.payment_schedules
  WHERE invoice_id = p_invoice_id
  AND installment_number < p_installment_number
  AND status != 'paid';
  
  RETURN unpaid_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7️⃣ TRIGGER: Mettre à jour facture après paiement échéance
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_invoice_on_installment_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrémenter le compteur d'échéances payées
  UPDATE public.invoices
  SET 
    installments_paid = (
      SELECT COUNT(*)
      FROM public.payment_schedules
      WHERE invoice_id = NEW.invoice_id
      AND status = 'paid'
    ),
    amount_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payment_schedules
      WHERE invoice_id = NEW.invoice_id
      AND status = 'paid'
    ),
    status = CASE
      -- Si toutes les échéances sont payées
      WHEN (
        SELECT COUNT(*)
        FROM public.payment_schedules
        WHERE invoice_id = NEW.invoice_id
        AND status = 'paid'
      ) = (
        SELECT installments_count
        FROM public.invoices
        WHERE id = NEW.invoice_id
      ) THEN 'paid'
      -- Si au moins une échéance est payée
      WHEN (
        SELECT COUNT(*)
        FROM public.payment_schedules
        WHERE invoice_id = NEW.invoice_id
        AND status = 'paid'
      ) > 0 THEN 'partially_paid'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.invoice_id;
  
  -- Calculer le montant restant
  UPDATE public.invoices
  SET amount_remaining = amount - COALESCE(amount_paid, 0)
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop et recréer le trigger
DROP TRIGGER IF EXISTS trigger_update_invoice_on_installment_paid ON public.payment_schedules;
CREATE TRIGGER trigger_update_invoice_on_installment_paid
  AFTER UPDATE OF status ON public.payment_schedules
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION public.update_invoice_on_installment_paid();

-- =====================================================
-- 8️⃣ FONCTION: Générer plan de paiement
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_payment_schedule(
  p_invoice_id UUID,
  p_user_id UUID,
  p_company_id UUID,
  p_quote_id UUID,
  p_total_amount NUMERIC,
  p_installments_count INTEGER,
  p_first_due_date DATE DEFAULT CURRENT_DATE
)
RETURNS SETOF public.payment_schedules AS $$
DECLARE
  installment_amount NUMERIC;
  last_installment_amount NUMERIC;
  current_due_date DATE;
  i INTEGER;
BEGIN
  -- Valider les entrées
  IF p_installments_count < 2 THEN
    RAISE EXCEPTION 'Le nombre d''échéances doit être au moins 2';
  END IF;
  
  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant total doit être positif';
  END IF;
  
  -- Calculer le montant par échéance (arrondi à 2 décimales)
  installment_amount := ROUND(p_total_amount / p_installments_count, 2);
  
  -- Le dernier paiement prend la différence pour éviter les erreurs d'arrondi
  last_installment_amount := p_total_amount - (installment_amount * (p_installments_count - 1));
  
  -- Générer les échéances
  FOR i IN 1..p_installments_count LOOP
    -- Calculer la date d'échéance (tous les 30 jours)
    current_due_date := p_first_due_date + ((i - 1) * 30);
    
    -- Insérer l'échéance
    RETURN QUERY
    INSERT INTO public.payment_schedules (
      user_id,
      company_id,
      invoice_id,
      quote_id,
      installment_number,
      total_installments,
      amount,
      due_date,
      status
    ) VALUES (
      p_user_id,
      p_company_id,
      p_invoice_id,
      p_quote_id,
      i,
      p_installments_count,
      CASE WHEN i = p_installments_count THEN last_installment_amount ELSE installment_amount END,
      current_due_date,
      'pending'
    )
    RETURNING *;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9️⃣ COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.payment_schedules IS 'Échéancier pour paiements fractionnés';
COMMENT ON COLUMN public.payment_schedules.installment_number IS 'Numéro de l''échéance (1, 2, 3...)';
COMMENT ON COLUMN public.payment_schedules.total_installments IS 'Nombre total d''échéances du plan';
COMMENT ON COLUMN public.payment_schedules.status IS 'pending: en attente, processing: en cours, paid: payé, overdue: en retard, cancelled: annulé';
COMMENT ON FUNCTION public.get_next_unpaid_installment IS 'Retourne le numéro de la prochaine échéance impayée';
COMMENT ON FUNCTION public.is_previous_installment_paid IS 'Vérifie si toutes les échéances précédentes sont payées';
COMMENT ON FUNCTION public.generate_payment_schedule IS 'Génère un plan de paiement avec N échéances espacées de 30 jours';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SYSTÈME DE PAIEMENT EN PLUSIEURS FOIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table payment_schedules créée';
  RAISE NOTICE 'Colonnes invoices/payments mises à jour';
  RAISE NOTICE 'Fonctions utilitaires créées';
  RAISE NOTICE 'Triggers automatiques configurés';
  RAISE NOTICE 'RLS activé';
  RAISE NOTICE '========================================';
END $$;


