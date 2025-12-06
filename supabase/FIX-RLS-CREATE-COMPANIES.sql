-- =====================================================
-- SCRIPT COMPLET - CORRECTION RLS ET GESTION DES RÔLES
-- =====================================================
-- Ce script corrige entièrement la gestion des rôles et RLS
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER L'ANCIEN ENUM (ignore les erreurs)
-- =====================================================

DO $$ BEGIN
    DROP TYPE IF EXISTS app_role CASCADE;
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- =====================================================
-- 2. RECRÉATION PROPRE DU TYPE ENUM
-- =====================================================

CREATE TYPE app_role AS ENUM ('admin', 'member');

-- =====================================================
-- 3. SUPPRIMER LA TABLE user_roles SI CASSÉE
-- =====================================================

DROP TABLE IF EXISTS user_roles CASCADE;

-- =====================================================
-- 4. RECRÉER UNE TABLE PROPRE
-- =====================================================

CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Créer les index pour performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- =====================================================
-- 5. ACTIVER RLS
-- =====================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. SUPPRIMER TOUTES LES ANCIENNES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Dirigeants can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can delete their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can select their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all" ON user_roles;
DROP POLICY IF EXISTS "User can insert own record" ON user_roles;
DROP POLICY IF EXISTS "Admin can insert any" ON user_roles;
DROP POLICY IF EXISTS "User can update own" ON user_roles;
DROP POLICY IF EXISTS "Admin can update any" ON user_roles;
DROP POLICY IF EXISTS "User can delete own" ON user_roles;
DROP POLICY IF EXISTS "Admin can delete any" ON user_roles;

-- =====================================================
-- 7. FONCTION SÉCURISÉE POUR VÉRIFIER SI UN UTILISATEUR EST ADMIN
-- =====================================================
-- Cette fonction évite la récursion RLS en utilisant SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
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
      AND role = 'admin'::app_role
  )
$$;

-- =====================================================
-- 8. POLICIES RLS PROPREMENT CONFIGURÉES
-- =====================================================

-- Voir son propre rôle
CREATE POLICY "Users can select their own role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Les admins peuvent tout lire (utilise la fonction pour éviter la récursion)
CREATE POLICY "Admins can read all" ON user_roles
FOR SELECT USING (public.is_admin(auth.uid()));

-- Insert par soi-même
CREATE POLICY "User can insert own record" ON user_roles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin peut tout insérer
CREATE POLICY "Admin can insert any" ON user_roles
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Mise à jour par soi-même
CREATE POLICY "User can update own" ON user_roles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin peut tout mettre à jour
CREATE POLICY "Admin can update any" ON user_roles
FOR UPDATE USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Suppression par soi-même
CREATE POLICY "User can delete own" ON user_roles
FOR DELETE USING (auth.uid() = user_id);

-- Admin peut tout supprimer
CREATE POLICY "Admin can delete any" ON user_roles
FOR DELETE USING (public.is_admin(auth.uid()));

-- =====================================================
-- 9. CRÉER/METTRE À JOUR LA TABLE companies
-- =====================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);

-- Activer RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. SUPPRIMER TOUTES LES ANCIENNES POLICIES companies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Owners can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;

-- =====================================================
-- 11. POLICIES RLS POUR companies
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les entreprises
CREATE POLICY "Admins can view all companies" ON public.companies
FOR SELECT USING (public.is_admin(auth.uid()));

-- SELECT : Les utilisateurs peuvent voir les entreprises où ils sont owner
CREATE POLICY "Users can view their own companies" ON public.companies
FOR SELECT USING (owner_id = auth.uid());

-- INSERT : Les admins peuvent créer des entreprises
CREATE POLICY "Admins can insert companies" ON public.companies
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- INSERT : Les utilisateurs peuvent créer des entreprises (ils deviennent owner)
CREATE POLICY "Users can insert companies" ON public.companies
FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

-- UPDATE : Les admins peuvent modifier toutes les entreprises
CREATE POLICY "Admins can update companies" ON public.companies
FOR UPDATE USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE : Les propriétaires peuvent modifier leurs entreprises
CREATE POLICY "Owners can update their companies" ON public.companies
FOR UPDATE USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE : Les admins peuvent supprimer toutes les entreprises
CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE USING (public.is_admin(auth.uid()));

-- =====================================================
-- 12. GRANT PERMISSIONS POUR L'API REST
-- =====================================================

GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;

-- =====================================================
-- 13. FONCTION POUR AJOUTER LE RÔLE ADMIN À UN UTILISATEUR
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_user_admin(p_user_id UUID)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_roles;
BEGIN
  -- Insérer ou mettre à jour le rôle admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin'::app_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'admin'::app_role
  RETURNING * INTO v_role;
  
  RETURN v_role;
END;
$$;

-- =====================================================
-- 14. TRIGGER pour updated_at sur companies
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 15. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Script exécuté avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Structure créée :';
  RAISE NOTICE '   - Enum app_role: admin, member';
  RAISE NOTICE '   - Table user_roles: user_id (PRIMARY KEY), role, created_at';
  RAISE NOTICE '   - Table companies: id, name, owner_id, plan, features, settings, support_level, status, created_at, updated_at';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS activé avec policies :';
  RAISE NOTICE '   - user_roles: SELECT/INSERT/UPDATE/DELETE pour utilisateurs (leur propre rôle) et admins (tous)';
  RAISE NOTICE '   - companies: SELECT/INSERT/UPDATE/DELETE pour admins (tous), SELECT/INSERT/UPDATE pour users (leurs entreprises)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 PROCHAINE ÉTAPE IMPORTANTE :';
  RAISE NOTICE '   Exécutez cette commande pour ajouter votre rôle admin :';
  RAISE NOTICE '   SELECT public.set_user_admin(auth.uid());';
  RAISE NOTICE '';
  RAISE NOTICE '   Ou directement :';
  RAISE NOTICE '   INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), ''admin''::app_role) ON CONFLICT (user_id) DO UPDATE SET role = ''admin''::app_role;';
END $$;
