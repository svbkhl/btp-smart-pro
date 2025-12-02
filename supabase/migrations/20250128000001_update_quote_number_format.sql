-- Mise à jour de la fonction pour utiliser 4 chiffres au lieu de 6
CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year TEXT;
  max_number INTEGER;
  next_number TEXT;
BEGIN
  -- Récupérer l'année en cours
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Trouver le numéro le plus élevé pour l'année en cours
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(quote_number FROM 'DEV-\d{4}-(\d+)') AS INTEGER
      )
    ), 
    0
  ) INTO max_number
  FROM ai_quotes
  WHERE quote_number LIKE 'DEV-' || current_year || '-%';
  
  -- Générer le prochain numéro (padding avec des zéros sur 4 chiffres)
  next_number := 'DEV-' || current_year || '-' || LPAD((max_number + 1)::TEXT, 4, '0');
  
  RETURN next_number;
END;
$$;

-- Mettre à jour le commentaire
COMMENT ON FUNCTION get_next_quote_number() IS 'Génère le prochain numéro de devis au format DEV-YYYY-NNNN de manière séquentielle (ex: DEV-2025-0001)';





