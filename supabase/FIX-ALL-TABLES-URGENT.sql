-- =====================================================
-- SCRIPT URGENT - CRÉATION DES TABLES MANQUANTES
-- =====================================================
-- Ce script corrige les erreurs 500 sur user_roles et companies
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. CRÉER L'ENUM app_role SI IL N'EXISTE PAS
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('dirigeant', 'salarie', 'client', 'administrateur');
  ELSE
    -- Ajouter 'administrateur' si l'enum existe mais n'a pas cette valeur
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrateur';
    EXCEPTION WHEN duplicate_object THEN
      -- La valeur existe déjà, on continue
      NULL;
    END;
  END IF;
END $$;

-- =====================================================
-- 2. CRÉER/METTRE À JOUR LA TABLE user_roles
-- =====================================================

-- Supprimer la table si elle existe avec l'ancienne structure
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Créer la table user_roles avec l'enum app_role
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'salarie'::app_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Activer RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Dirigeants can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;

-- Fonction sécurisée pour vérifier les rôles (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Politique : Les utilisateurs peuvent voir leur propre rôle
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : Les dirigeants peuvent voir tous les rôles de leur entreprise
-- (utilise la fonction has_role pour éviter la récursion)
CREATE POLICY "Dirigeants can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Politique : Les administrateurs peuvent voir tous les rôles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'administrateur'::app_role));

-- Politique : Les utilisateurs peuvent insérer leur propre rôle
CREATE POLICY "Users can insert their own role"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : Les admins peuvent mettre à jour les rôles
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'dirigeant'::app_role)
  );

-- =====================================================
-- 3. CRÉER LA TABLE companies
-- =====================================================

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

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

-- =====================================================
-- 4. CRÉER LA TABLE company_users
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users(role);

-- =====================================================
-- 5. ROW LEVEL SECURITY POUR companies
-- =====================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage all companies" ON public.companies;

-- Politique : Les utilisateurs peuvent voir leur entreprise
CREATE POLICY "Users can view their company"
  ON public.companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- Politique : Les admins peuvent gérer toutes les entreprises
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    public.has_role(auth.uid(), 'administrateur'::app_role)
  );

-- =====================================================
-- 6. ROW LEVEL SECURITY POUR company_users
-- =====================================================

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Users can view their company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can manage company_users" ON public.company_users;

-- Politique : Les utilisateurs peuvent voir leurs liaisons
CREATE POLICY "Users can view their company_users"
  ON public.company_users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- Politique : Les admins peuvent gérer les liaisons
CREATE POLICY "Admins can manage company_users"
  ON public.company_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_users.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    public.has_role(auth.uid(), 'administrateur'::app_role)
  );

-- =====================================================
-- 7. TRIGGER pour updated_at
-- =====================================================

-- Créer la fonction si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir la company_id d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_company_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.company_users
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si une feature est activée
CREATE OR REPLACE FUNCTION is_feature_enabled(p_company_id UUID, p_feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_features JSONB;
BEGIN
  SELECT features INTO v_features
  FROM public.companies
  WHERE id = p_company_id;
  
  RETURN COALESCE((v_features->>p_feature_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Tables user_roles et companies créées avec succès !';
  RAISE NOTICE '📋 Vous pouvez maintenant :';
  RAISE NOTICE '   1. Insérer un rôle pour votre utilisateur dans user_roles';
  RAISE NOTICE '   2. Créer une entreprise dans companies';
  RAISE NOTICE '   3. Lier l''utilisateur à l''entreprise dans company_users';
END $$;





