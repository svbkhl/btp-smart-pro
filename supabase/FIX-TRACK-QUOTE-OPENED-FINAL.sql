-- ============================================================
-- FIX COMPLET : tracking "Consulté par le client"
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Vérifier l'état actuel
SELECT
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'track_quote_opened';

-- 2. Supprimer toutes les versions existantes de la fonction
DROP FUNCTION IF EXISTS track_quote_opened(UUID);
DROP FUNCTION IF EXISTS track_quote_opened(text);
DROP FUNCTION IF EXISTS track_quote_opened();

-- 3. S'assurer que la colonne existe
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS client_opened_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Recréer la fonction proprement
-- SECURITY DEFINER = bypass RLS complet (pas besoin d'être authentifié)
-- Pas de condition sur signed (on veut tracker même les devis signés)
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

-- 5. Donner l'accès en exécution aux anonymes ET aux authentifiés
GRANT EXECUTE ON FUNCTION track_quote_opened(UUID) TO anon;
GRANT EXECUTE ON FUNCTION track_quote_opened(UUID) TO authenticated;

-- 6. Vérification : la fonction est bien créée
SELECT
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_name = 'track_quote_opened';
-- Doit afficher : track_quote_opened | DEFINER
