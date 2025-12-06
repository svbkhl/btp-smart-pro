-- =====================================================
-- 🚀 SCRIPTS SQL RESTANTS À EXÉCUTER
-- =====================================================
-- Ce fichier combine les scripts critiques restants
-- 
-- 📋 INSTRUCTIONS :
--   1. Ouvrez Supabase Dashboard → SQL Editor
--   2. Copiez TOUT ce script
--   3. Collez dans l'éditeur SQL
--   4. Cliquez sur "Run" ou appuyez sur Cmd/Ctrl + Enter
-- =====================================================

-- =====================================================
-- SCRIPT 1 : CORRECTION RLS POUR CRÉATION D'ENTREPRISES
-- =====================================================
-- ⚠️ CRITIQUE : Corrige le problème du bouton "Créer"
-- =====================================================

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;

-- Créer une nouvelle policy qui permet aux admins système de créer des entreprises
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    -- Pour SELECT/UPDATE/DELETE : vérifier si l'utilisateur est dans company_users OU est admin système
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  )
  WITH CHECK (
    -- Pour INSERT : permettre uniquement aux admins système
    -- (car une nouvelle entreprise n'a pas encore de company_users)
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- SCRIPT 2 : SYSTÈME DE PAIEMENTS MULTI-PROVIDERS
-- =====================================================
-- Recommandé : Active le support pour plusieurs providers
-- =====================================================

-- Table pour stocker les credentials des payment providers
CREATE TABLE IF NOT EXISTS public.payment_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('stripe', 'sumup', 'payplug', 'stancer', 'gocardless')),
  credentials JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_provider_credentials ENABLE ROW LEVEL SECURITY;

-- Policies pour payment_provider_credentials
DROP POLICY IF EXISTS "Users can view their own payment provider credentials" ON public.payment_provider_credentials;
CREATE POLICY "Users can view their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own payment provider credentials" ON public.payment_provider_credentials;
CREATE POLICY "Users can create their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own payment provider credentials" ON public.payment_provider_credentials;
CREATE POLICY "Users can update their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own payment provider credentials" ON public.payment_provider_credentials;
CREATE POLICY "Users can delete their own payment provider credentials"
  ON public.payment_provider_credentials
  FOR DELETE
  USING (
    auth.uid() = user_id 
    OR company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_user_id 
  ON public.payment_provider_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_company_id 
  ON public.payment_provider_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_provider_type 
  ON public.payment_provider_credentials(provider_type);
CREATE INDEX IF NOT EXISTS idx_payment_provider_credentials_is_active 
  ON public.payment_provider_credentials(is_active);

-- Contraintes uniques pour un seul provider actif à la fois (via index unique partiel)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_provider_per_user 
  ON public.payment_provider_credentials(user_id) 
  WHERE is_active = true AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_provider_per_company 
  ON public.payment_provider_credentials(company_id) 
  WHERE is_active = true AND company_id IS NOT NULL;

-- Ajouter les colonnes payment_provider dans user_settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    -- Ajouter preferred_payment_provider si n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'preferred_payment_provider'
    ) THEN
      ALTER TABLE public.user_settings 
      ADD COLUMN preferred_payment_provider TEXT DEFAULT 'stripe' 
      CHECK (preferred_payment_provider IN ('stripe', 'sumup', 'payplug', 'stancer', 'gocardless'));
    END IF;

    -- Ajouter les colonnes pour les credentials Stripe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'stripe_api_key'
    ) THEN
      ALTER TABLE public.user_settings 
      ADD COLUMN stripe_api_key TEXT,
      ADD COLUMN stripe_account_id TEXT;
    END IF;

    -- Ajouter les colonnes pour les autres providers
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'sumup_access_token'
    ) THEN
      ALTER TABLE public.user_settings 
      ADD COLUMN sumup_access_token TEXT,
      ADD COLUMN sumup_client_id TEXT,
      ADD COLUMN sumup_client_secret TEXT,
      ADD COLUMN payplug_api_key TEXT,
      ADD COLUMN payplug_client_id TEXT,
      ADD COLUMN payplug_client_secret TEXT,
      ADD COLUMN stancer_api_key TEXT,
      ADD COLUMN stancer_public_key TEXT,
      ADD COLUMN gocardless_access_token TEXT,
      ADD COLUMN gocardless_webhook_secret TEXT;
    END IF;
  END IF;
END $$;

-- Enrichir la table payments avec les informations du provider
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    -- Ajouter payment_provider si n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'payment_provider'
    ) THEN
      ALTER TABLE public.payments 
      ADD COLUMN payment_provider TEXT DEFAULT 'stripe'
      CHECK (payment_provider IN ('stripe', 'sumup', 'payplug', 'stancer', 'gocardless'));
    END IF;

    -- Ajouter provider_payment_id si n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'provider_payment_id'
    ) THEN
      ALTER TABLE public.payments 
      ADD COLUMN provider_payment_id TEXT,
      ADD COLUMN provider_session_id TEXT,
      ADD COLUMN provider_webhook_id TEXT;
    END IF;

    -- Renommer stripe_session_id en provider_session_id si existe
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
CREATE INDEX IF NOT EXISTS idx_payments_payment_provider 
  ON public.payments(payment_provider) 
  WHERE payment_provider IS NOT NULL;
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

-- =====================================================
-- ✅ SCRIPTS EXÉCUTÉS AVEC SUCCÈS !
-- =====================================================
-- 
-- Vérifications :
-- 1. Le bouton "Créer" dans "Gestion Entreprises" devrait maintenant fonctionner
-- 2. Le système de paiements multi-providers est activé
-- 
-- =====================================================

