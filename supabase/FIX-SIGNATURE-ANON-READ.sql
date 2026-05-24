-- ============================================================
-- CORRECTIF : Lecture anonyme du devis pour la page de signature
-- Problème : RLS bloque SELECT sur ai_quotes pour les clients anonymes
-- Solution : SECURITY DEFINER function qui bypasse RLS
-- ============================================================

DROP FUNCTION IF EXISTS get_quote_for_signing(UUID);

CREATE OR REPLACE FUNCTION get_quote_for_signing(p_quote_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_quote jsonb;
BEGIN
  SELECT to_jsonb(q) INTO v_quote
  FROM ai_quotes q
  WHERE q.id = p_quote_id;

  IF v_quote IS NULL THEN
    RETURN NULL;
  END IF;

  -- Ne pas exposer les données sensibles inutiles
  v_quote := v_quote - 'user_id';

  RETURN v_quote;
END;
$func$;

-- Accessible aux clients anonymes ET utilisateurs connectés
GRANT EXECUTE ON FUNCTION get_quote_for_signing(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_quote_for_signing(UUID) TO authenticated;
