-- Migration: Ajouter les colonnes Stripe Connect à user_settings
-- Cette migration ajoute les colonnes nécessaires pour stocker les informations de connexion Stripe

-- Ajouter les colonnes Stripe Connect
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false;

-- Créer un index pour les recherches par compte Stripe
CREATE INDEX IF NOT EXISTS idx_user_settings_stripe_account_id 
ON public.user_settings(stripe_account_id) 
WHERE stripe_account_id IS NOT NULL;

-- Ajouter un commentaire descriptif
COMMENT ON COLUMN public.user_settings.stripe_account_id IS 'ID du compte Stripe Connect (format: acct_xxx)';
COMMENT ON COLUMN public.user_settings.stripe_connected IS 'Indique si le compte Stripe est connecté et peut recevoir des paiements';
COMMENT ON COLUMN public.user_settings.stripe_charges_enabled IS 'Indique si les paiements par carte sont activés sur le compte Stripe';
COMMENT ON COLUMN public.user_settings.stripe_payouts_enabled IS 'Indique si les versements sont activés sur le compte Stripe';
COMMENT ON COLUMN public.user_settings.stripe_details_submitted IS 'Indique si toutes les informations ont été soumises à Stripe';
