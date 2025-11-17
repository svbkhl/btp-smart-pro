-- =====================================================
-- CORRIGER LA NUMÉROTATION DES DEVIS POUR QU'ELLE SOIT SÉQUENTIELLE
-- =====================================================
-- Ce script s'assure que tous les devis existants ont un numéro
-- et que le compteur est correctement initialisé
-- =====================================================

-- 1. S'assurer que la table quote_counters existe
CREATE TABLE IF NOT EXISTS public.quote_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. S'assurer que la colonne quote_number existe dans ai_quotes
ALTER TABLE public.ai_quotes
ADD COLUMN IF NOT EXISTS quote_number TEXT;

-- 3. Créer ou remplacer la fonction pour obtenir le prochain numéro
CREATE OR REPLACE FUNCTION public.get_next_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year INTEGER;
  next_counter INTEGER;
  quote_number TEXT;
BEGIN
  -- Obtenir l'année actuelle
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Insérer ou mettre à jour le compteur pour cette année
  INSERT INTO public.quote_counters (year, counter)
  VALUES (current_year, 1)
  ON CONFLICT (year) 
  DO UPDATE SET 
    counter = quote_counters.counter + 1,
    updated_at = now()
  RETURNING counter INTO next_counter;
  
  -- Si l'INSERT n'a pas retourné de valeur, faire un SELECT
  IF next_counter IS NULL THEN
    SELECT counter INTO next_counter
    FROM public.quote_counters
    WHERE year = current_year;
  END IF;
  
  -- Formater le numéro : DEV-YYYY-NNNN (ex: DEV-2025-0001)
  quote_number := 'DEV-' || current_year || '-' || LPAD(next_counter::TEXT, 4, '0');
  
  RETURN quote_number;
END;
$$;

-- 4. Initialiser le compteur pour l'année actuelle en fonction des devis existants
DO $$
DECLARE
  current_year INTEGER;
  max_number INTEGER;
  existing_quotes_count INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Compter les devis existants pour cette année
  SELECT COUNT(*) INTO existing_quotes_count
  FROM public.ai_quotes
  WHERE quote_number IS NOT NULL
    AND quote_number LIKE 'DEV-' || current_year || '-%';
  
  -- Trouver le numéro maximum existant pour cette année
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 'DEV-' || current_year || '-(.+)$') AS INTEGER)
  ), 0) INTO max_number
  FROM public.ai_quotes
  WHERE quote_number IS NOT NULL
    AND quote_number LIKE 'DEV-' || current_year || '-%';
  
  -- Initialiser ou mettre à jour le compteur
  INSERT INTO public.quote_counters (year, counter)
  VALUES (current_year, GREATEST(max_number, existing_quotes_count))
  ON CONFLICT (year) 
  DO UPDATE SET 
    counter = GREATEST(public.quote_counters.counter, max_number, existing_quotes_count),
    updated_at = now();
END $$;

-- 5. Créer un index pour améliorer les recherches et le tri
CREATE INDEX IF NOT EXISTS idx_ai_quotes_quote_number ON public.ai_quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_created_at ON public.ai_quotes(created_at DESC);

-- 6. Commentaires
COMMENT ON FUNCTION public.get_next_quote_number() IS 'Retourne le prochain numéro de devis séquentiel au format DEV-YYYY-NNNN';

SELECT '✅ Script FIX-QUOTE-NUMBERING-ORDER.sql exécuté avec succès.' AS status;


