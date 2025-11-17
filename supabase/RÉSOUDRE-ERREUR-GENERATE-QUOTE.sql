-- =====================================================
-- RÉSOUDRE L'ERREUR generate-quote
-- =====================================================
-- Ce script résout les problèmes courants avec generate-quote
-- =====================================================

-- 1. Créer la table ai_quotes si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.ai_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  surface NUMERIC,
  work_type TEXT,
  materials TEXT[],
  image_urls TEXT[],
  estimated_cost NUMERIC,
  details JSONB,
  status TEXT DEFAULT 'draft',
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Ajouter les colonnes manquantes si elles n'existent pas
DO $$
BEGIN
  -- Colonnes pour les notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_quotes' AND column_name='sent_at') THEN
    ALTER TABLE public.ai_quotes ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_quotes' AND column_name='confirmed_at') THEN
    ALTER TABLE public.ai_quotes ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_quotes' AND column_name='client_email') THEN
    ALTER TABLE public.ai_quotes ADD COLUMN client_email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_quotes' AND column_name='due_date') THEN
    ALTER TABLE public.ai_quotes ADD COLUMN due_date DATE;
  END IF;
END $$;

-- 3. Activer RLS
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.ai_quotes;

-- 5. Créer les policies RLS
CREATE POLICY "Users can view their own quotes" 
ON public.ai_quotes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.ai_quotes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.ai_quotes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.ai_quotes FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Créer le trigger pour updated_at
DROP TRIGGER IF EXISTS update_ai_quotes_updated_at ON public.ai_quotes;
CREATE TRIGGER update_ai_quotes_updated_at
  BEFORE UPDATE ON public.ai_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_quotes_user_id ON public.ai_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_status ON public.ai_quotes(status);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_created_at ON public.ai_quotes(created_at);

-- 9. Vérifier que tout est correct
DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Vérifier la table
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes'
  ) INTO table_exists;
  
  -- Vérifier les policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
  AND tablename = 'ai_quotes';
  
  IF table_exists THEN
    RAISE NOTICE '✅ Table ai_quotes existe';
  ELSE
    RAISE EXCEPTION '❌ Table ai_quotes n''existe pas';
  END IF;
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ Policies RLS configurées (% policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️ Nombre de policies insuffisant: % (attendu: 4)', policy_count;
  END IF;
  
  RAISE NOTICE '✅ Script terminé avec succès';
END $$;

