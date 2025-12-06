-- =====================================================
-- 🚀 CRÉER LA TABLE companies
-- =====================================================
-- Script simple pour créer uniquement la table companies
-- si elle n'existe pas encore
-- =====================================================

-- Créer la table companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'custom' CHECK (plan IN ('basic', 'pro', 'enterprise', 'custom')),
  features JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  support_level INTEGER DEFAULT 0 CHECK (support_level IN (0, 1, 2)),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'no_support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

-- Activer RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;

-- Policy pour permettre aux admins système de créer des entreprises
-- Cette policy permet aux admins de faire TOUT (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    -- Pour SELECT/UPDATE/DELETE : vérifier si l'utilisateur est dans company_users OU est admin système
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  )
  WITH CHECK (
    -- Pour INSERT : permettre uniquement aux admins système
    -- (car une nouvelle entreprise n'a pas encore de company_users)
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_companies_updated_at();

-- Vérification
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    RAISE NOTICE '✅ Table companies créée avec succès !';
  ELSE
    RAISE EXCEPTION '❌ Erreur : La table companies n''a pas pu être créée';
  END IF;
END $$;

