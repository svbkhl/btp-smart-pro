-- ============================================
-- Migration: Multi-Payment Providers Support
-- ============================================
-- Cette migration ajoute le support pour plusieurs fournisseurs de paiement
-- (Stripe, SumUp, PayPlug, Stancer, GoCardless)
-- ============================================

-- Table pour stocker les credentials des payment providers
CREATE TABLE IF NOT EXISTS public.payment_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('stripe', 'sumup', 'payplug', 'stancer', 'gocardless')),
  credentials JSONB NOT NULL, -- Stocke les clés API (à chiffrer en production)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Un utilisateur/entreprise ne peut avoir qu'un seul provider actif à la fois
  CONSTRAINT unique_active_provider_per_user 
    UNIQUE NULLS NOT DISTINCT (user_id, is_active) 
    WHERE is_active = true,
  CONSTRAINT unique_active_provider_per_company 
    UNIQUE NULLS NOT DISTINCT (company_id, is_active) 
    WHERE is_active = true
);

-- Enable RLS
ALTER TABLE public.payment_provider_credentials ENABLE ROW LEVEL SECURITY;

-- Policies pour payment_provider_credentials
CREATE POLICY "Users can view their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.companies WHERE id = company_id
  ));

CREATE POLICY "Users can create their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.companies WHERE id = company_id
  ));

CREATE POLICY "Users can update their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.companies WHERE id = company_id
  ))
  WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.companies WHERE id = company_id
  ));

CREATE POLICY "Users can delete their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.companies WHERE id = company_id
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_user_id 
  ON public.payment_provider_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_company_id 
  ON public.payment_provider_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_provider_type 
  ON public.payment_provider_credentials(provider_type);
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_is_active 
  ON public.payment_provider_credentials(is_active);

-- Ajouter les colonnes payment_provider dans user_settings (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    -- Ajouter payment_provider si n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'payment_provider'
    ) THEN
      ALTER TABLE public.user_settings 
      ADD COLUMN payment_provider TEXT DEFAULT 'stripe' 
      CHECK (payment_provider IN ('stripe', 'sumup', 'payplug', 'stancer', 'gocardless'));
    END IF;

    -- Ajouter payment_provider_credentials si n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'payment_provider_credentials'
    ) THEN
      ALTER TABLE public.user_settings 
      ADD COLUMN payment_provider_credentials JSONB;
    END IF;
  END IF;
END $$;

-- Enrichir la table payments avec les informations du provider
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    -- Ajouter provider_type si n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'provider_type'
    ) THEN
      ALTER TABLE public.payments 
      ADD COLUMN provider_type TEXT 
      CHECK (provider_type IN ('stripe', 'sumup', 'payplug', 'stancer', 'gocardless'));
    END IF;

    -- Ajouter provider_payment_id si n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'provider_payment_id'
    ) THEN
      ALTER TABLE public.payments 
      ADD COLUMN provider_payment_id TEXT;
    END IF;

    -- Ajouter provider_session_id si n'existe pas (pour Stripe notamment)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'provider_session_id'
    ) THEN
      ALTER TABLE public.payments 
      ADD COLUMN provider_session_id TEXT;
    END IF;

    -- Renommer stripe_session_id en provider_session_id si existe (migration)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'stripe_session_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'provider_session_id'
    ) THEN
      ALTER TABLE public.payments 
      RENAME COLUMN stripe_session_id TO provider_session_id;
    END IF;
  END IF;
END $$;

-- Indexes pour payments enrichis
CREATE INDEX IF NOT EXISTS idx_payments_provider_type 
  ON public.payments(provider_type) 
  WHERE provider_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id 
  ON public.payments(provider_payment_id) 
  WHERE provider_payment_id IS NOT NULL;

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_payment_provider_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_payment_provider_credentials_updated_at 
  ON public.payment_provider_credentials;
CREATE TRIGGER trigger_update_payment_provider_credentials_updated_at
  BEFORE UPDATE ON public.payment_provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_provider_credentials_updated_at();

-- Commentaires
COMMENT ON TABLE public.payment_provider_credentials IS 'Stores encrypted credentials for payment providers (Stripe, SumUp, PayPlug, Stancer, GoCardless)';
COMMENT ON COLUMN public.payment_provider_credentials.provider_type IS 'Type of payment provider: stripe, sumup, payplug, stancer, gocardless';
COMMENT ON COLUMN public.payment_provider_credentials.credentials IS 'Encrypted JSON containing API keys and secrets for the provider';
COMMENT ON COLUMN public.payment_provider_credentials.is_active IS 'Whether this provider configuration is currently active';















