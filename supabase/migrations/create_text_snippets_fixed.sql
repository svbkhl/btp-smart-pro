-- ============================================
-- TABLE: text_snippets (Bibliothèque de phrases réutilisables)
-- ============================================
-- Table pour stocker les textes réutilisables dans les devis et factures
-- ============================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.text_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('introduction', 'description', 'conditions', 'conclusion', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_text_snippets_company_id ON public.text_snippets(company_id);
CREATE INDEX IF NOT EXISTS idx_text_snippets_category ON public.text_snippets(company_id, category);
CREATE INDEX IF NOT EXISTS idx_text_snippets_usage_count ON public.text_snippets(company_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_text_snippets_user_id ON public.text_snippets(user_id);

-- Activer RLS
ALTER TABLE public.text_snippets ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "select_own_company_text_snippets" ON public.text_snippets;
DROP POLICY IF EXISTS "insert_own_company_text_snippets" ON public.text_snippets;
DROP POLICY IF EXISTS "update_own_company_text_snippets" ON public.text_snippets;
DROP POLICY IF EXISTS "delete_own_company_text_snippets" ON public.text_snippets;

-- RLS Policies - Utiliser current_company_id() pour l'isolation multi-tenant
CREATE POLICY "select_own_company_text_snippets" ON public.text_snippets
  FOR SELECT 
  USING (
    company_id = public.current_company_id()
    OR company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_company_text_snippets" ON public.text_snippets
  FOR INSERT 
  WITH CHECK (
    company_id = public.current_company_id()
    OR company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_company_text_snippets" ON public.text_snippets
  FOR UPDATE 
  USING (
    company_id = public.current_company_id()
    OR company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = public.current_company_id()
    OR company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "delete_own_company_text_snippets" ON public.text_snippets
  FOR DELETE 
  USING (
    company_id = public.current_company_id()
    OR company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_text_snippets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_text_snippets_updated_at ON public.text_snippets;
CREATE TRIGGER trigger_update_text_snippets_updated_at
  BEFORE UPDATE ON public.text_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_text_snippets_updated_at();

-- Trigger pour forcer company_id depuis current_company_id()
CREATE OR REPLACE FUNCTION public.enforce_text_snippets_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  v_company_id := public.current_company_id();
  
  -- Si current_company_id() retourne NULL, essayer depuis company_users
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.company_users
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Si toujours NULL, utiliser celui fourni (si présent)
  IF v_company_id IS NULL AND NEW.company_id IS NOT NULL THEN
    v_company_id := NEW.company_id;
  END IF;
  
  -- Forcer company_id
  IF v_company_id IS NOT NULL THEN
    NEW.company_id := v_company_id;
  ELSE
    RAISE EXCEPTION 'company_id cannot be determined for user %', auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_text_snippets_company_id_trigger ON public.text_snippets;
CREATE TRIGGER enforce_text_snippets_company_id_trigger
  BEFORE INSERT ON public.text_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_text_snippets_company_id();

-- Fonction RPC pour incrémenter l'utilisation d'un snippet
CREATE OR REPLACE FUNCTION public.increment_snippet_usage(snippet_id UUID)
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  v_company_id := public.current_company_id();
  
  -- Si current_company_id() retourne NULL, essayer depuis company_users
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.company_users
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Mettre à jour le snippet seulement si le company_id correspond
  IF v_company_id IS NOT NULL THEN
    UPDATE public.text_snippets
    SET 
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = snippet_id
      AND company_id = v_company_id;
  ELSE
    RAISE EXCEPTION 'company_id cannot be determined for user %', auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires pour documentation
COMMENT ON TABLE public.text_snippets IS 'Bibliothèque de phrases réutilisables pour les devis et factures';
COMMENT ON COLUMN public.text_snippets.category IS 'Catégorie du texte (introduction, description, conditions, conclusion, custom)';
COMMENT ON COLUMN public.text_snippets.usage_count IS 'Nombre de fois que ce texte a été utilisé';
COMMENT ON COLUMN public.text_snippets.last_used_at IS 'Date de dernière utilisation du texte';
