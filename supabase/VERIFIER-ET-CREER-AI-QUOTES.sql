-- =====================================================
-- VÉRIFIER ET CRÉER LA TABLE ai_quotes
-- =====================================================
-- Ce script vérifie si la table ai_quotes existe
-- et la crée avec toutes les colonnes nécessaires
-- =====================================================

-- Créer la table ai_quotes si elle n'existe pas
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

-- Ajouter les colonnes pour les notifications si elles n'existent pas
ALTER TABLE public.ai_quotes 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmation_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_pending_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_unconfirmed_sent BOOLEAN DEFAULT FALSE;

-- Activer RLS
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_quotes_user_id ON public.ai_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_status ON public.ai_quotes(status);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_created_at ON public.ai_quotes(created_at);

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.ai_quotes;

-- Créer les policies RLS
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

-- Créer le trigger pour updated_at si il n'existe pas
DROP TRIGGER IF EXISTS update_ai_quotes_updated_at ON public.ai_quotes;
CREATE TRIGGER update_ai_quotes_updated_at
  BEFORE UPDATE ON public.ai_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vérifier que la table existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes'
  ) THEN
    RAISE NOTICE '✅ Table ai_quotes existe et est configurée correctement';
  ELSE
    RAISE EXCEPTION '❌ Table ai_quotes n''existe pas';
  END IF;
END $$;

-- Vérifier les policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
  AND tablename = 'ai_quotes';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ Policies RLS configurées (% policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️ Nombre de policies insuffisant: % (attendu: 4)', policy_count;
  END IF;
END $$;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Script terminé avec succès';
  RAISE NOTICE '   - Table ai_quotes vérifiée/créée';
  RAISE NOTICE '   - Colonnes ajoutées si nécessaire';
  RAISE NOTICE '   - RLS activé';
  RAISE NOTICE '   - Policies créées';
  RAISE NOTICE '   - Index créés';
END $$;

