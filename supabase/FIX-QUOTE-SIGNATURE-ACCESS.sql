-- =====================================================
-- FIX: Permettre l'accès public aux devis via Edge Function
-- =====================================================
-- Ce script permet aux Edge Functions d'accéder aux devis
-- même sans authentification utilisateur (via service_role)

-- Les Edge Functions utilisent SUPABASE_SERVICE_ROLE_KEY
-- qui contourne RLS, donc pas besoin de politique publique

-- Cependant, on peut ajouter une politique pour permettre
-- la lecture publique si nécessaire (mais ce n'est pas recommandé)

-- Vérifier que les colonnes nécessaires existent
DO $$ 
BEGIN
  -- Ajouter signed si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signed'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- S'assurer que les colonnes de signature existent
ALTER TABLE public.ai_quotes 
ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signed_by TEXT,
ADD COLUMN IF NOT EXISTS signature_data TEXT;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_quotes_signed ON public.ai_quotes(signed);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_signed_at ON public.ai_quotes(signed_at);

COMMENT ON COLUMN public.ai_quotes.signed IS 'Indique si le devis a été signé';
COMMENT ON COLUMN public.ai_quotes.signed_at IS 'Date et heure de la signature';
COMMENT ON COLUMN public.ai_quotes.signed_by IS 'Nom de la personne qui a signé';
COMMENT ON COLUMN public.ai_quotes.signature_data IS 'Données de la signature (image base64)';





