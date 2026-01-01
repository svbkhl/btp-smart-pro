-- =====================================================
-- AJOUTER LES COLONNES DE SIGNATURE ÉLECTRONIQUE
-- =====================================================
-- Ce script ajoute toutes les colonnes nécessaires pour
-- la signature électronique dans ai_quotes et quotes
-- =====================================================

DO $$ 
BEGIN
  -- ai_quotes: signed (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signed'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne signed ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne signed existe déjà dans ai_quotes';
  END IF;

  -- ai_quotes: signed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Colonne signed_at ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne signed_at existe déjà dans ai_quotes';
  END IF;

  -- ai_quotes: signed_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signed_by'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_by TEXT;
    RAISE NOTICE '✅ Colonne signed_by ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne signed_by existe déjà dans ai_quotes';
  END IF;

  -- ai_quotes: signature_data (base64 de l'image)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_data TEXT;
    RAISE NOTICE '✅ Colonne signature_data ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne signature_data existe déjà dans ai_quotes';
  END IF;

  -- ai_quotes: signature_user_agent (traçabilité)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_user_agent'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_user_agent TEXT;
    RAISE NOTICE '✅ Colonne signature_user_agent ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne signature_user_agent existe déjà dans ai_quotes';
  END IF;

  -- ai_quotes: signature_url (lien public de signature)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_url'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_url TEXT;
    RAISE NOTICE '✅ Colonne signature_url ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne signature_url existe déjà dans ai_quotes';
  END IF;

  -- ai_quotes: signature_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_quotes'
    AND column_name = 'signature_token'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_token TEXT;
    RAISE NOTICE '✅ Colonne signature_token ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne signature_token existe déjà dans ai_quotes';
  END IF;
END $$;

-- Faire la même chose pour la table quotes (si elle existe)
DO $$ 
BEGIN
  -- Vérifier si la table quotes existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'quotes'
  ) THEN
    -- quotes: signed (boolean)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signed'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signed BOOLEAN DEFAULT false;
      RAISE NOTICE '✅ Colonne signed ajoutée à quotes';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne signed existe déjà dans quotes';
    END IF;

    -- quotes: signed_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signed_at'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
      RAISE NOTICE '✅ Colonne signed_at ajoutée à quotes';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne signed_at existe déjà dans quotes';
    END IF;

    -- quotes: signed_by
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signed_by'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signed_by TEXT;
      RAISE NOTICE '✅ Colonne signed_by ajoutée à quotes';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne signed_by existe déjà dans quotes';
    END IF;

    -- quotes: signature_data
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_data'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_data TEXT;
      RAISE NOTICE '✅ Colonne signature_data ajoutée à quotes';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne signature_data existe déjà dans quotes';
    END IF;

    -- quotes: signature_user_agent
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_user_agent'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_user_agent TEXT;
      RAISE NOTICE '✅ Colonne signature_user_agent ajoutée à quotes';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne signature_user_agent existe déjà dans quotes';
    END IF;

    -- quotes: signature_url
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_url'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_url TEXT;
      RAISE NOTICE '✅ Colonne signature_url ajoutée à quotes';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne signature_url existe déjà dans quotes';
    END IF;

    -- quotes: signature_token
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'signature_token'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN signature_token TEXT;
      RAISE NOTICE '✅ Colonne signature_token ajoutée à quotes';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne signature_token existe déjà dans quotes';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Table quotes n''existe pas, skip';
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_quotes_signed ON public.ai_quotes(signed) WHERE signed = true;
CREATE INDEX IF NOT EXISTS idx_ai_quotes_signature_token ON public.ai_quotes(signature_token) WHERE signature_token IS NOT NULL;

-- Faire de même pour quotes si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quotes'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_quotes_signed ON public.quotes(signed) WHERE signed = true;
    CREATE INDEX IF NOT EXISTS idx_quotes_signature_token ON public.quotes(signature_token) WHERE signature_token IS NOT NULL;
  END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN public.ai_quotes.signed IS 'Indique si le devis a été signé électroniquement';
COMMENT ON COLUMN public.ai_quotes.signed_at IS 'Date et heure de la signature';
COMMENT ON COLUMN public.ai_quotes.signed_by IS 'Nom du signataire';
COMMENT ON COLUMN public.ai_quotes.signature_data IS 'Image de la signature en base64 (PNG)';
COMMENT ON COLUMN public.ai_quotes.signature_user_agent IS 'User Agent du navigateur (traçabilité)';
COMMENT ON COLUMN public.ai_quotes.signature_url IS 'URL publique pour signer le devis';
COMMENT ON COLUMN public.ai_quotes.signature_token IS 'Token de sécurité pour la signature';

RAISE NOTICE '========================================';
RAISE NOTICE '✅ COLONNES DE SIGNATURE AJOUTÉES';
RAISE NOTICE '========================================';
