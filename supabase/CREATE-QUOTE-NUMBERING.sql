-- Système de numérotation automatique des devis
-- Les devis auront des numéros cohérents qui se suivent : DEV-YYYY-NNNN

-- Créer une table pour stocker le compteur de devis par année
CREATE TABLE IF NOT EXISTS public.quote_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.quote_counters ENABLE ROW LEVEL SECURITY;

-- Policy : Tous les utilisateurs authentifiés peuvent lire et mettre à jour
CREATE POLICY "Users can manage quote counters"
  ON public.quote_counters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Fonction pour obtenir le prochain numéro de devis
CREATE OR REPLACE FUNCTION public.get_next_quote_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter une colonne quote_number à ai_quotes si elle n'existe pas
ALTER TABLE public.ai_quotes
ADD COLUMN IF NOT EXISTS quote_number TEXT;

-- Créer un index pour améliorer les recherches
CREATE INDEX IF NOT EXISTS idx_ai_quotes_quote_number ON public.ai_quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_year ON public.ai_quotes((EXTRACT(YEAR FROM created_at)));

-- Commentaires
COMMENT ON TABLE public.quote_counters IS 'Compteur pour générer des numéros de devis séquentiels par année';
COMMENT ON FUNCTION public.get_next_quote_number() IS 'Retourne le prochain numéro de devis au format DEV-YYYY-NNNN';


