-- =====================================================
-- SYSTÈME COMPLET DE SIGNATURE ET PAIEMENT
-- =====================================================
-- Ce script crée toutes les tables et fonctions nécessaires
-- pour le workflow Email → Signature → Paiement
-- =====================================================

-- 1️⃣ Créer la table signatures
CREATE TABLE IF NOT EXISTS public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT,
  signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ,
  signature_data TEXT, -- Données de la signature (image base64, etc.)
  signature_link TEXT NOT NULL UNIQUE,
  payment_link TEXT,
  payment_link_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
    -- Ajouter invoice_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE;
    END IF;

    -- Ajouter client_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'client_name'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN client_name TEXT;
    END IF;

    -- Ajouter signature_data si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'signature_data'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN signature_data TEXT;
    END IF;

    -- Ajouter payment_link si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'payment_link'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN payment_link TEXT;
    END IF;

    -- Ajouter payment_link_sent_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'payment_link_sent_at'
    ) THEN
        ALTER TABLE public.signatures ADD COLUMN payment_link_sent_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3️⃣ Activer RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can insert their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can update their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Public can view signature by link" ON public.signatures;
DROP POLICY IF EXISTS "Public can update signature by link" ON public.signatures;

-- 5️⃣ Créer les policies RLS
-- Les utilisateurs peuvent voir leurs propres signatures
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

-- Les utilisateurs peuvent créer des signatures pour leurs devis/factures
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

-- Les utilisateurs peuvent mettre à jour leurs signatures
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

-- Le public peut voir une signature via son lien (pour la page de signature)
CREATE POLICY "Public can view signature by link"
ON public.signatures
FOR SELECT
USING (true); -- Permet à n'importe qui de voir via le lien

-- Le public peut mettre à jour une signature via son lien (pour signer)
CREATE POLICY "Public can update signature by link"
ON public.signatures
FOR UPDATE
USING (true) -- Permet à n'importe qui de signer via le lien
WITH CHECK (true);

-- 6️⃣ Créer les index
CREATE INDEX IF NOT EXISTS idx_signatures_quote_id ON public.signatures(quote_id);
CREATE INDEX IF NOT EXISTS idx_signatures_invoice_id ON public.signatures(invoice_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signature_link ON public.signatures(signature_link);
CREATE INDEX IF NOT EXISTS idx_signatures_client_email ON public.signatures(client_email);
CREATE INDEX IF NOT EXISTS idx_signatures_signed ON public.signatures(signed);

-- 7️⃣ Créer un trigger pour updated_at
CREATE OR REPLACE FUNCTION update_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_signatures_updated_at ON public.signatures;

CREATE TRIGGER trigger_update_signatures_updated_at
BEFORE UPDATE ON public.signatures
FOR EACH ROW
EXECUTE FUNCTION update_signatures_updated_at();

-- 8️⃣ Fonction pour générer un lien de signature
CREATE OR REPLACE FUNCTION generate_signature_link()
RETURNS TEXT AS $$
BEGIN
  -- Génère un UUID unique pour le lien de signature
  RETURN gen_random_uuid()::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9️⃣ Vérifier que les colonnes sont bien présentes
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

-- ✅ Script terminé avec succès !
-- La table signatures est maintenant prête à être utilisée











