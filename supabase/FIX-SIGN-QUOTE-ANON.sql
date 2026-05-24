-- ============================================================
-- FIX BUG 3 : Signature par un client anonyme
-- La fonction signQuote() requiert une session auth → impossible pour un client
-- Cette fonction SECURITY DEFINER bypasse RLS et permet la signature sans login
-- ============================================================

DROP FUNCTION IF EXISTS sign_quote_anon(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION sign_quote_anon(
  p_quote_id      UUID,
  p_signature_data TEXT,
  p_signer_name   TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le devis existe et n'est pas déjà signé
  IF NOT EXISTS (SELECT 1 FROM ai_quotes WHERE id = p_quote_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Devis introuvable');
  END IF;

  IF EXISTS (SELECT 1 FROM ai_quotes WHERE id = p_quote_id AND signed = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce devis a déjà été signé');
  END IF;

  UPDATE ai_quotes
  SET
    signed           = true,
    signed_at        = NOW(),
    signed_by        = p_signer_name,
    signature_data   = p_signature_data,
    status           = 'signed',
    updated_at       = NOW()
  WHERE id = p_quote_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Accessible aux clients anonymes ET aux utilisateurs connectés
GRANT EXECUTE ON FUNCTION sign_quote_anon(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sign_quote_anon(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================
-- FIX BUG 1 : Marquer comme payé
-- ============================================================

DROP FUNCTION IF EXISTS update_quote_payment_status(UUID, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION update_quote_payment_status(
  p_quote_id        UUID,
  p_payment_status  TEXT,
  p_status          TEXT,
  p_paid_at         TIMESTAMPTZ DEFAULT NULL
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

GRANT EXECUTE ON FUNCTION update_quote_payment_status(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- ============================================================
-- FIX BUG 2 : Tracking "Consulté par le client"
-- ============================================================

DROP FUNCTION IF EXISTS track_quote_opened(UUID);
DROP FUNCTION IF EXISTS track_quote_opened(text);

ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS client_opened_at TIMESTAMPTZ DEFAULT NULL;

CREATE OR REPLACE FUNCTION track_quote_opened(quote_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_quotes
  SET client_opened_at = NOW()
  WHERE id = quote_id
    AND client_opened_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION track_quote_opened(UUID) TO anon;
GRANT EXECUTE ON FUNCTION track_quote_opened(UUID) TO authenticated;
