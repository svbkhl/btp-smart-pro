-- Colonnes manquantes pour la signature (sign-quote Edge Function)
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signature_ip_address TEXT DEFAULT NULL;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signature_user_agent TEXT DEFAULT NULL;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Vérification
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ai_quotes'
  AND column_name IN ('signature_ip_address', 'signature_user_agent', 'updated_at');
