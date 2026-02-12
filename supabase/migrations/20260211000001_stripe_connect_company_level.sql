-- =====================================================
-- Stripe Connect au niveau de l'entreprise (company)
-- =====================================================
-- Une entreprise utilise un seul compte Stripe Connect pour les paiements.
-- Le premier owner qui configure Stripe définit la config pour toute l'entreprise.
-- =====================================================

-- Colonnes Stripe Connect sur companies (paiements devis/factures)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_stripe_connect_account_id
  ON public.companies(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN public.companies.stripe_connect_account_id IS 'ID compte Stripe Connect (acct_xxx) - 1 par entreprise pour les paiements';
COMMENT ON COLUMN public.companies.stripe_connect_connected IS 'Stripe Connect configuré et peut recevoir des paiements';
COMMENT ON COLUMN public.companies.stripe_connect_charges_enabled IS 'Paiements par carte activés sur le compte Stripe';
COMMENT ON COLUMN public.companies.stripe_connect_payouts_enabled IS 'Versements activés sur le compte Stripe';
COMMENT ON COLUMN public.companies.stripe_connect_details_submitted IS 'Informations Stripe complètement soumises';

-- Migrer les données existantes : user_settings -> companies
-- Pour chaque user qui a stripe_account_id, copier vers sa company (owner)
DO $$
DECLARE
  rec RECORD;
  v_company_id UUID;
BEGIN
  FOR rec IN
    SELECT us.user_id, us.stripe_account_id, us.stripe_connected,
           us.stripe_charges_enabled, us.stripe_payouts_enabled, us.stripe_details_submitted
    FROM public.user_settings us
    WHERE us.stripe_account_id IS NOT NULL
  LOOP
    -- Récupérer la company de l'owner (première company où il est owner)
    SELECT cu.company_id INTO v_company_id
    FROM public.company_users cu
    WHERE cu.user_id = rec.user_id
      AND cu.role = 'owner'
    ORDER BY cu.created_at ASC
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      UPDATE public.companies
      SET
        stripe_connect_account_id = rec.stripe_account_id,
        stripe_connect_connected = COALESCE(rec.stripe_connected, false),
        stripe_connect_charges_enabled = COALESCE(rec.stripe_charges_enabled, false),
        stripe_connect_payouts_enabled = COALESCE(rec.stripe_payouts_enabled, false),
        stripe_connect_details_submitted = COALESCE(rec.stripe_details_submitted, false),
        updated_at = NOW()
      WHERE id = v_company_id
        AND (stripe_connect_account_id IS NULL OR stripe_connect_account_id = '');
    END IF;
  END LOOP;
END $$;
