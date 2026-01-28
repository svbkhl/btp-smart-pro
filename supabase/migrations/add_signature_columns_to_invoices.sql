-- Ajouter les colonnes de signature à la table invoices
-- Ces colonnes permettent de stocker la signature électronique des factures

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS signature_data TEXT;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS signed_by TEXT;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.invoices.signature_data IS 'Signature électronique en base64 (image PNG) de la facture signée par le client';
COMMENT ON COLUMN public.invoices.signed_by IS 'Nom du signataire de la facture';
COMMENT ON COLUMN public.invoices.signed_at IS 'Date et heure de signature de la facture';
