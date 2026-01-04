-- ================================================================
-- SCRIPT SQL : Ajouter IP et Audit Trail pour signature électronique
-- VERSION ULTRA-ROBUSTE - Vérifie tout avant modification
-- ================================================================

-- ================================================================
-- 1. AJOUTER COLONNE IP_ADDRESS
-- ================================================================

DO $$ 
BEGIN
  -- Ajouter ip_address à ai_quotes si elle n'existe pas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_quotes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ai_quotes' AND column_name = 'signature_ip_address'
    ) THEN
      ALTER TABLE ai_quotes ADD COLUMN signature_ip_address TEXT;
      RAISE NOTICE '✅ Colonne signature_ip_address ajoutée à ai_quotes';
    ELSE
      RAISE NOTICE '⚠️ Colonne signature_ip_address existe déjà dans ai_quotes';
    END IF;
  ELSE
    RAISE NOTICE '❌ Table ai_quotes n''existe pas';
  END IF;

  -- Ajouter ip_address à quotes si la table existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quotes' AND column_name = 'signature_ip_address'
    ) THEN
      ALTER TABLE quotes ADD COLUMN signature_ip_address TEXT;
      RAISE NOTICE '✅ Colonne signature_ip_address ajoutée à quotes';
    ELSE
      RAISE NOTICE '⚠️ Colonne signature_ip_address existe déjà dans quotes';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Table quotes n''existe pas (normal si vous utilisez seulement ai_quotes)';
  END IF;
END $$;

-- ================================================================
-- 2. TABLE SIGNATURE_EVENTS (Audit Trail)
-- ================================================================

DO $$
BEGIN
  -- Supprimer la table si elle existe déjà (pour réinitialisation propre)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_events') THEN
    DROP TABLE signature_events CASCADE;
    RAISE NOTICE 'ℹ️ Table signature_events existante supprimée';
  END IF;
END $$;

CREATE TABLE signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID,
  session_token TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_signature_events_quote_id ON signature_events(quote_id);
CREATE INDEX idx_signature_events_session_token ON signature_events(session_token);
CREATE INDEX idx_signature_events_created_at ON signature_events(created_at);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Table signature_events créée avec succès';
END $$;

-- ================================================================
-- 3. TABLE SIGNATURE_OTP (Codes de vérification)
-- ================================================================

DO $$
BEGIN
  -- Supprimer la table si elle existe déjà
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_otp') THEN
    DROP TABLE signature_otp CASCADE;
    RAISE NOTICE 'ℹ️ Table signature_otp existante supprimée';
  END IF;
END $$;

CREATE TABLE signature_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID,
  session_token TEXT,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_signature_otp_session_token ON signature_otp(session_token);
CREATE INDEX idx_signature_otp_email ON signature_otp(email);
CREATE INDEX idx_signature_otp_expires_at ON signature_otp(expires_at);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Table signature_otp créée avec succès';
END $$;

-- ================================================================
-- 4. RLS (Row Level Security)
-- ================================================================

-- Activer RLS sur signature_events
ALTER TABLE signature_events ENABLE ROW LEVEL SECURITY;

-- Supprimer policies existantes si elles existent
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read signature_events" ON signature_events;
  DROP POLICY IF EXISTS "Allow public insert signature_events" ON signature_events;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Créer policies
CREATE POLICY "Allow public read signature_events"
  ON signature_events
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert signature_events"
  ON signature_events
  FOR INSERT
  WITH CHECK (true);

-- Activer RLS sur signature_otp
ALTER TABLE signature_otp ENABLE ROW LEVEL SECURITY;

-- Supprimer policies existantes
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read signature_otp" ON signature_otp;
  DROP POLICY IF EXISTS "Allow public insert signature_otp" ON signature_otp;
  DROP POLICY IF EXISTS "Allow public update signature_otp" ON signature_otp;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Créer policies
CREATE POLICY "Allow public read signature_otp"
  ON signature_otp
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert signature_otp"
  ON signature_otp
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update signature_otp"
  ON signature_otp
  FOR UPDATE
  USING (true);

DO $$ 
BEGIN
  RAISE NOTICE '✅ RLS configuré pour signature_events et signature_otp';
END $$;

-- ================================================================
-- 5. FONCTION : Nettoyer les OTP expirés
-- ================================================================

CREATE OR REPLACE FUNCTION clean_expired_otp()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM signature_otp
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Fonction clean_expired_otp créée';
END $$;

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================

DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Script terminé avec succès !';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables créées :';
  RAISE NOTICE '   - signature_events (audit trail)';
  RAISE NOTICE '   - signature_otp (codes OTP)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Colonnes ajoutées :';
  RAISE NOTICE '   - ai_quotes.signature_ip_address';
  RAISE NOTICE '   - quotes.signature_ip_address (si table existe)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS activé sur toutes les tables';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT : Les tables signature_events et signature_otp';
  RAISE NOTICE '   ont été réinitialisées (données précédentes supprimées)';
  RAISE NOTICE '========================================';
END $$;


