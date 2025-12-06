-- =====================================================
-- FIX URGENT : Ajouter les colonnes manquantes à ai_quotes
-- =====================================================
-- Ce script ajoute les colonnes manquantes nécessaires
-- pour que la génération de devis fonctionne
-- =====================================================

-- 1️⃣ Vérifier et ajouter client_name si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'client_name'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN client_name TEXT;
    RAISE NOTICE '✅ Colonne client_name ajoutée';
  ELSE
    RAISE NOTICE '✅ Colonne client_name existe déjà';
  END IF;
END $$;

-- 2️⃣ Vérifier et ajouter quote_number si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'quote_number'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN quote_number TEXT;
    RAISE NOTICE '✅ Colonne quote_number ajoutée';
  ELSE
    RAISE NOTICE '✅ Colonne quote_number existe déjà';
  END IF;
END $$;

-- 3️⃣ Vérifier et ajouter details (JSONB) si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'details'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN details JSONB;
    RAISE NOTICE '✅ Colonne details ajoutée';
  ELSE
    RAISE NOTICE '✅ Colonne details existe déjà';
  END IF;
END $$;

-- 4️⃣ Vérifier et ajouter estimated_cost si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'estimated_cost'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN estimated_cost NUMERIC;
    RAISE NOTICE '✅ Colonne estimated_cost ajoutée';
  ELSE
    RAISE NOTICE '✅ Colonne estimated_cost existe déjà';
  END IF;
END $$;

-- 5️⃣ Vérifier et ajouter status si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN status TEXT DEFAULT 'draft';
    RAISE NOTICE '✅ Colonne status ajoutée';
  ELSE
    RAISE NOTICE '✅ Colonne status existe déjà';
  END IF;
END $$;

-- 6️⃣ Vérifier et ajouter user_id si elle n'existe pas (colonne critique)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Colonne user_id ajoutée';
  ELSE
    RAISE NOTICE '✅ Colonne user_id existe déjà';
  END IF;
END $$;

-- 7️⃣ Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;

-- 8️⃣ Supprimer les anciennes policies pour repartir propre
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can insert their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.ai_quotes;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.ai_quotes;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.ai_quotes;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.ai_quotes;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.ai_quotes;

-- 9️⃣ Créer les policies RLS complètes pour tous les CRUD
-- Autoriser INSERT pour tout utilisateur authentifié
CREATE POLICY "Allow insert for authenticated"
ON public.ai_quotes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Autoriser SELECT pour tout utilisateur authentifié (ses propres devis)
CREATE POLICY "Allow select for authenticated"
ON public.ai_quotes
FOR SELECT
USING (auth.uid() = user_id);

-- Autoriser UPDATE pour tout utilisateur authentifié (ses propres devis)
CREATE POLICY "Allow update for authenticated"
ON public.ai_quotes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Autoriser DELETE pour tout utilisateur authentifié (ses propres devis)
CREATE POLICY "Allow delete for authenticated"
ON public.ai_quotes
FOR DELETE
USING (auth.uid() = user_id);

-- 🔟 Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_quotes_user_id ON public.ai_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_quote_number ON public.ai_quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_status ON public.ai_quotes(status);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_created_at ON public.ai_quotes(created_at);

-- 1️⃣1️⃣ Vérifier que les colonnes sont bien présentes
SELECT 
  column_name,
  data_type,
  is_nullable,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ai_quotes'
AND column_name IN ('client_name', 'quote_number', 'user_id', 'estimated_cost', 'details', 'status')
ORDER BY column_name;

-- 1️⃣2️⃣ Vérifier que les policies sont bien appliquées
SELECT 
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'ai_quotes'
ORDER BY cmd, policyname;

-- ✅ Script terminé avec succès !
-- Vous pouvez maintenant créer des devis sans erreur 400

