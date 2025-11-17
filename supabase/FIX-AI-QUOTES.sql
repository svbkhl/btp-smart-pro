-- ============================================
-- FIX: Ajouter les colonnes manquantes à ai_quotes
-- ============================================
-- Ce script ajoute les colonnes manquantes à la table ai_quotes
-- si elles n'existent pas déjà
-- ============================================

-- Ajouter quote_number si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'quote_number'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN quote_number TEXT UNIQUE;
  END IF;
END $$;

-- Ajouter signature_data si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_data TEXT;
  END IF;
END $$;

-- Ajouter signed_at si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Ajouter signed_by si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signed_by'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_by TEXT;
  END IF;
END $$;

-- Créer l'index sur quote_number si la colonne existe maintenant
CREATE INDEX IF NOT EXISTS idx_ai_quotes_quote_number ON public.ai_quotes(quote_number);

-- ============================================
-- Vérification
-- ============================================
SELECT 
  column_name,
  data_type,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ai_quotes'
AND column_name IN ('quote_number', 'signature_data', 'signed_at', 'signed_by')
ORDER BY column_name;

