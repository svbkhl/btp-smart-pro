-- cancel_at : date à laquelle Stripe annulera l'abonnement (résiliation programmée)
-- Utilisé pour l'offre mensuelle avec engagement 1 an (résiliation effective en fin d'engagement)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.companies.cancel_at IS 'Date programmée d''annulation Stripe (résiliation en fin d''engagement pour mensuel)';
