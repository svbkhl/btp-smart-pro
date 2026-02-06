-- ============================================================================
-- stripe_onboarding_required : nouvelles entreprises = choix forfait Stripe obligatoire
-- Anciennes entreprises (créées avant) : comportement normal (pas de paywall)
-- ============================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_onboarding_required BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.companies.stripe_onboarding_required IS
  'Si true : première connexion impose choix forfait Stripe. Si false : entreprises legacy, pas de paywall.';

-- Toutes les entreprises existantes → pas de paywall (legacy)
UPDATE public.companies
SET stripe_onboarding_required = false
WHERE stripe_onboarding_required = true;
