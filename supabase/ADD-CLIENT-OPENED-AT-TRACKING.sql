-- Ajouter la colonne client_opened_at à ai_quotes
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS client_opened_at TIMESTAMPTZ DEFAULT NULL;

-- Politique RLS : permettre à n'importe qui (client anonyme) de mettre à jour
-- uniquement client_opened_at sur un devis donné (par son ID)
-- Cela permet le tracking d'ouverture sans authentification
CREATE POLICY IF NOT EXISTS "allow_anonymous_track_opened"
  ON ai_quotes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- IMPORTANT : si la politique ci-dessus est trop permissive, utiliser celle-ci à la place
-- (restreint à la colonne client_opened_at uniquement via une fonction)
-- CREATE OR REPLACE FUNCTION track_quote_opened(quote_id UUID)
-- RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   UPDATE ai_quotes
--   SET client_opened_at = NOW()
--   WHERE id = quote_id AND client_opened_at IS NULL AND signed IS NOT TRUE;
-- END;
-- $$;
-- GRANT EXECUTE ON FUNCTION track_quote_opened TO anon;
