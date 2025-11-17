-- ============================================
-- CORRECTION AUTOMATIQUE : Table Projects
-- ============================================
-- Ce script vérifie et crée/corrige la table projects
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Créer la table si elle n'existe pas
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'planifié' CHECK (status IN ('planifié', 'en_attente', 'en_cours', 'terminé', 'annulé')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget NUMERIC,
  location TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- ÉTAPE 2 : Créer les index
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- ============================================
-- ÉTAPE 3 : Activer RLS
-- ============================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 4 : Supprimer les anciennes policies
-- ============================================

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- ============================================
-- ÉTAPE 5 : Créer les RLS policies
-- ============================================

-- Users can view their own projects
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own projects
CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- ÉTAPE 6 : Créer le trigger pour updated_at
-- ============================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger si il existe
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;

-- Créer le trigger
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ÉTAPE 7 : Vérification
-- ============================================

-- Vérifier que la table existe
SELECT 
    '✅ Table projects créée' as status,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'projects';

-- Vérifier les policies
SELECT 
    '✅ RLS Policies créées' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'projects';

-- Vérifier que RLS est activé
SELECT 
    '✅ RLS activé' as status,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'projects';

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- column_count: 14
-- policy_count: 4
-- rls_enabled: true
-- ============================================

