-- ============================================================
-- FIX : Bouton "Marquer comme payé" — fonction SECURITY DEFINER
-- Contourne le filtre company_id qui bloque l'admin
-- ============================================================

DROP FUNCTION IF EXISTS update_quote_payment_status(UUID, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION update_quote_payment_status(
  p_quote_id     UUID,
  p_payment_status TEXT,
  p_status       TEXT,
  p_paid_at      TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_quotes
  SET
    payment_status = p_payment_status,
    status         = p_status,
    paid_at        = p_paid_at,
    updated_at     = NOW()
  WHERE id = p_quote_id;
END;
$$;

-- Uniquement les utilisateurs authentifiés (pas anon)
GRANT EXECUTE ON FUNCTION update_quote_payment_status(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
