-- =====================================================
-- Invitations : offre, prix Stripe et période d'essai
-- =====================================================
-- Avant d'envoyer une invitation, l'owner choisit l'offre, le prix et la période d'essai.
-- Ces infos sont stockées sur l'invitation et utilisées au checkout (create-checkout avec invitation_id).
-- =====================================================

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER CHECK (trial_days IS NULL OR (trial_days >= 0 AND trial_days <= 365)),
  ADD COLUMN IF NOT EXISTS offer_label TEXT;

COMMENT ON COLUMN public.invitations.stripe_price_id IS 'ID du prix Stripe (price_xxx) pour la souscription liée à cette invitation';
COMMENT ON COLUMN public.invitations.trial_days IS 'Nombre de jours d''essai gratuit (0 à 365)';
COMMENT ON COLUMN public.invitations.offer_label IS 'Libellé de l''offre (ex. Pro Mensuel)';
