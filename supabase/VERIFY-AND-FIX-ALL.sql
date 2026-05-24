-- ============================================================
-- VÉRIFICATION ET CORRECTION COMPLÈTE
-- Exécuter CE BLOC ENTIER d'un coup dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter les colonnes manquantes si besoin
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS client_opened_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false;

-- 2. Recréer sign_quote_anon
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
AS $func$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ai_quotes WHERE id = p_quote_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Devis introuvable');
  END IF;
  IF EXISTS (SELECT 1 FROM ai_quotes WHERE id = p_quote_id AND signed = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce devis a déjà été signé');
  END IF;
  UPDATE ai_quotes
  SET
    signed         = true,
    signed_at      = NOW(),
    signed_by      = p_signer_name,
    signature_data = p_signature_data,
    status         = 'signed',
    updated_at     = NOW()
  WHERE id = p_quote_id;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;
GRANT EXECUTE ON FUNCTION sign_quote_anon(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sign_quote_anon(UUID, TEXT, TEXT) TO authenticated;

-- 3. Recréer update_quote_payment_status
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
AS $func$
BEGIN
  UPDATE ai_quotes
  SET
    payment_status = p_payment_status,
    status         = p_status,
    paid_at        = p_paid_at,
    updated_at     = NOW()
  WHERE id = p_quote_id;
END;
$func$;
GRANT EXECUTE ON FUNCTION update_quote_payment_status(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- 4. Recréer track_quote_opened
DROP FUNCTION IF EXISTS track_quote_opened(UUID);
DROP FUNCTION IF EXISTS track_quote_opened(text);
CREATE OR REPLACE FUNCTION track_quote_opened(quote_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  UPDATE ai_quotes
  SET client_opened_at = NOW()
  WHERE id = quote_id
    AND client_opened_at IS NULL;
END;
$func$;
GRANT EXECUTE ON FUNCTION track_quote_opened(UUID) TO anon;
GRANT EXECUTE ON FUNCTION track_quote_opened(UUID) TO authenticated;

-- 5. Vérification finale
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('sign_quote_anon', 'update_quote_payment_status', 'track_quote_opened');
