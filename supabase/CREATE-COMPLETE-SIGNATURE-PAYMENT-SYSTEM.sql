-- =====================================================
-- SYSTÈME COMPLET : SIGNATURE + PAIEMENT CONDITIONNEL
-- =====================================================
-- Ce script crée toutes les tables et colonnes nécessaires
-- pour le workflow Email → Signature → Paiement (conditionnel)
-- =====================================================

-- 1️⃣ Table signatures (mise à jour complète)
CREATE TABLE IF NOT EXISTS public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT,
  signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  signature_link TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ Table payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT,
  payment_link TEXT,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  payment_provider TEXT, -- 'stripe', 'paypal', 'bank_transfer', etc.
  payment_amount NUMERIC,
  payment_currency TEXT DEFAULT 'EUR',
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3️⃣ Ajouter les colonnes manquantes à payments si la table existe déjà
DO $$ 
BEGIN
    -- Ajouter quote_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'quote_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Colonne quote_id ajoutée à payments';
    END IF;

    -- Ajouter invoice_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Colonne invoice_id ajoutée à payments';
    END IF;

    -- Ajouter client_email si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'client_email'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN client_email TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Colonne client_email ajoutée à payments';
    END IF;

    -- Ajouter client_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'client_name'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN client_name TEXT;
        RAISE NOTICE '✅ Colonne client_name ajoutée à payments';
    END IF;

    -- Ajouter payment_link si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_link'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_link TEXT;
        RAISE NOTICE '✅ Colonne payment_link ajoutée à payments';
    END IF;

    -- Ajouter paid si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'paid'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN paid BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne paid ajoutée à payments';
    END IF;

    -- Ajouter paid_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN paid_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Colonne paid_at ajoutée à payments';
    END IF;

    -- Ajouter payment_provider si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_provider TEXT;
        RAISE NOTICE '✅ Colonne payment_provider ajoutée à payments';
    END IF;

    -- Ajouter payment_amount si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_amount'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_amount NUMERIC;
        RAISE NOTICE '✅ Colonne payment_amount ajoutée à payments';
    END IF;

    -- Ajouter payment_currency si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_currency'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_currency TEXT DEFAULT 'EUR';
        RAISE NOTICE '✅ Colonne payment_currency ajoutée à payments';
    END IF;

    -- Ajouter payment_reference si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_reference'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_reference TEXT;
        RAISE NOTICE '✅ Colonne payment_reference ajoutée à payments';
    END IF;

    -- Ajouter created_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE '✅ Colonne created_at ajoutée à payments';
    END IF;

    -- Ajouter updated_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE '✅ Colonne updated_at ajoutée à payments';
    END IF;
END $$;

-- 4️⃣ Ajouter les colonnes manquantes à signatures si la table existe déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'client_name'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN client_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'signature_data'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN signature_data TEXT;
    END IF;
END $$;

-- 5️⃣ Ajouter les colonnes de paiement à user_settings
DO $$ 
BEGIN
    -- Ajouter payment_enabled si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'payment_enabled'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN payment_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Colonne payment_enabled ajoutée à user_settings';
    END IF;

    -- Ajouter payment_provider si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN payment_provider TEXT;
        RAISE NOTICE '✅ Colonne payment_provider ajoutée à user_settings';
    END IF;

    -- Ajouter stripe_public_key si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'stripe_public_key'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN stripe_public_key TEXT;
        RAISE NOTICE '✅ Colonne stripe_public_key ajoutée à user_settings';
    END IF;

    -- Ajouter stripe_secret_key si elle n'existe pas (sera stocké de manière sécurisée)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'stripe_secret_key'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN stripe_secret_key TEXT;
        RAISE NOTICE '✅ Colonne stripe_secret_key ajoutée à user_settings';
    END IF;
END $$;

-- 6️⃣ Activer RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 7️⃣ Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can insert their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can update their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Public can view signature by link" ON public.signatures;
DROP POLICY IF EXISTS "Public can update signature by link" ON public.signatures;

DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Public can view payment by link" ON public.payments;
DROP POLICY IF EXISTS "Public can update payment by link" ON public.payments;

-- 8️⃣ Créer les policies RLS pour signatures
CREATE POLICY "Users can view their own signatures"
ON public.signatures
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.ai_quotes WHERE id = signatures.quote_id
    UNION
    SELECT user_id FROM public.invoices WHERE id = signatures.invoice_id
  )
);

CREATE POLICY "Users can insert their own signatures"
ON public.signatures
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.ai_quotes WHERE id = signatures.quote_id
    UNION
    SELECT user_id FROM public.invoices WHERE id = signatures.invoice_id
  )
);

CREATE POLICY "Users can update their own signatures"
ON public.signatures
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.ai_quotes WHERE id = signatures.quote_id
    UNION
    SELECT user_id FROM public.invoices WHERE id = signatures.invoice_id
  )
);

-- Le public peut voir et mettre à jour via le lien
CREATE POLICY "Public can view signature by link"
ON public.signatures
FOR SELECT
USING (true);

CREATE POLICY "Public can update signature by link"
ON public.signatures
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 9️⃣ Créer les policies RLS pour payments
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.ai_quotes WHERE id = payments.quote_id
    UNION
    SELECT user_id FROM public.invoices WHERE id = payments.invoice_id
  )
);

CREATE POLICY "Users can insert their own payments"
ON public.payments
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.ai_quotes WHERE id = payments.quote_id
    UNION
    SELECT user_id FROM public.invoices WHERE id = payments.invoice_id
  )
);

CREATE POLICY "Users can update their own payments"
ON public.payments
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.ai_quotes WHERE id = payments.quote_id
    UNION
    SELECT user_id FROM public.invoices WHERE id = payments.invoice_id
  )
);

-- Le public peut voir et mettre à jour via le lien
CREATE POLICY "Public can view payment by link"
ON public.payments
FOR SELECT
USING (true);

CREATE POLICY "Public can update payment by link"
ON public.payments
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 🔟 Créer les index
CREATE INDEX IF NOT EXISTS idx_signatures_quote_id ON public.signatures(quote_id);
CREATE INDEX IF NOT EXISTS idx_signatures_invoice_id ON public.signatures(invoice_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signature_link ON public.signatures(signature_link);
CREATE INDEX IF NOT EXISTS idx_signatures_client_email ON public.signatures(client_email);
CREATE INDEX IF NOT EXISTS idx_signatures_signed ON public.signatures(signed);

CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_email ON public.payments(client_email);
CREATE INDEX IF NOT EXISTS idx_payments_paid ON public.payments(paid);
CREATE INDEX IF NOT EXISTS idx_payments_payment_link ON public.payments(payment_link);

-- 1️⃣1️⃣ Créer les triggers pour updated_at
CREATE OR REPLACE FUNCTION update_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_signatures_updated_at ON public.signatures;
DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;

CREATE TRIGGER trigger_update_signatures_updated_at
BEFORE UPDATE ON public.signatures
FOR EACH ROW
EXECUTE FUNCTION update_signatures_updated_at();

CREATE TRIGGER trigger_update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at();

-- 1️⃣2️⃣ Vérifier que les colonnes sont bien présentes
SELECT 
  'signatures' as table_name,
  column_name,
  data_type,
  is_nullable,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'signatures'
ORDER BY ordinal_position;

SELECT 
  'payments' as table_name,
  column_name,
  data_type,
  is_nullable,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'payments'
ORDER BY ordinal_position;

SELECT 
  'user_settings' as table_name,
  column_name,
  data_type,
  is_nullable,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_settings'
AND column_name IN ('payment_enabled', 'payment_provider', 'stripe_public_key', 'stripe_secret_key')
ORDER BY column_name;

-- ✅ Script terminé avec succès !
-- Toutes les tables et colonnes sont maintenant prêtes

