-- Ajouter les colonnes de signature à la table invoices
-- Ces colonnes permettent de stocker la signature électronique des factures

-- Vérifier et ajouter signature_data
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN signature_data TEXT;
    COMMENT ON COLUMN public.invoices.signature_data IS 'Signature électronique en base64 (image PNG) de la facture signée par le client';
  END IF;
END $$;

-- Vérifier et ajouter signed_by
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'signed_by'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN signed_by TEXT;
    COMMENT ON COLUMN public.invoices.signed_by IS 'Nom du signataire de la facture';
  END IF;
END $$;

-- Vérifier et ajouter signed_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN public.invoices.signed_at IS 'Date et heure de signature de la facture';
  END IF;
END $$;
