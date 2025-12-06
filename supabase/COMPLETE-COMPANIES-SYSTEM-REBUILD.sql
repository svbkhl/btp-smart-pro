-- =====================================================
-- SCRIPT COMPLET - RECONSTRUCTION SYSTÈME COMPANIES
-- =====================================================
-- Ce script recrée entièrement le système de gestion des entreprises
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER LES ANCIENNES TABLES (si elles existent)
-- =====================================================

-- Supprimer dans l'ordre pour respecter les clés étrangères
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.company_users CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- =====================================================
-- 2. RECRÉER LA TABLE companies
-- =====================================================

CREATE TABLE public.companies (
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
CREATE INDEX idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_companies_plan ON public.companies(plan);
CREATE INDEX idx_companies_created_at ON public.companies(created_at);

-- =====================================================
-- 3. RECRÉER LA TABLE company_users
-- =====================================================

CREATE TABLE public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Index pour performance
CREATE INDEX idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX idx_company_users_role ON public.company_users(role);
CREATE INDEX idx_company_users_user_company ON public.company_users(user_id, company_id);

-- =====================================================
-- 4. RECRÉER LA TABLE invitations
-- =====================================================

CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_user_id ON public.invitations(user_id);
CREATE INDEX idx_invitations_invited_by ON public.invitations(invited_by);

-- =====================================================
-- 5. ACTIVER RLS SUR TOUTES LES TABLES
-- =====================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. FONCTION HELPER POUR VÉRIFIER SI ADMIN
-- =====================================================

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
-- 7. FONCTION HELPER POUR VÉRIFIER SI ADMIN DE COMPANY
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role IN ('owner', 'admin')
  )
$$;

-- =====================================================
-- 8. POLICIES RLS POUR companies
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les entreprises
CREATE POLICY "Admins can view all companies" ON public.companies
FOR SELECT USING (public.is_admin(auth.uid()));

-- SELECT : Les utilisateurs peuvent voir les entreprises où ils sont membres
CREATE POLICY "Users can view their companies" ON public.companies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = companies.id
      AND user_id = auth.uid()
  )
);

-- INSERT : Les admins peuvent créer des entreprises
CREATE POLICY "Admins can insert companies" ON public.companies
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- INSERT : Les utilisateurs peuvent créer des entreprises (ils deviennent owner)
CREATE POLICY "Users can insert companies" ON public.companies
FOR INSERT WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

-- UPDATE : Les admins peuvent modifier toutes les entreprises
CREATE POLICY "Admins can update companies" ON public.companies
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE : Les propriétaires et admins de company peuvent modifier leurs entreprises
CREATE POLICY "Company admins can update companies" ON public.companies
FOR UPDATE 
USING (
  owner_id = auth.uid() OR
  public.is_company_admin(auth.uid(), id)
)
WITH CHECK (
  owner_id = auth.uid() OR
  public.is_company_admin(auth.uid(), id)
);

-- DELETE : Les admins peuvent supprimer toutes les entreprises
CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE USING (public.is_admin(auth.uid()));

-- =====================================================
-- 9. POLICIES RLS POUR company_users
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les relations
CREATE POLICY "Admins can view all company_users" ON public.company_users
FOR SELECT USING (public.is_admin(auth.uid()));

-- SELECT : Les utilisateurs peuvent voir leurs propres relations
CREATE POLICY "Users can view their company_users" ON public.company_users
FOR SELECT USING (user_id = auth.uid());

-- SELECT : Les admins de company peuvent voir les membres de leur company
CREATE POLICY "Company admins can view company_users" ON public.company_users
FOR SELECT USING (
  public.is_company_admin(auth.uid(), company_id)
);

-- INSERT : Les admins peuvent créer des relations
CREATE POLICY "Admins can insert company_users" ON public.company_users
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- INSERT : Les admins de company peuvent ajouter des membres
CREATE POLICY "Company admins can insert company_users" ON public.company_users
FOR INSERT WITH CHECK (
  public.is_company_admin(auth.uid(), company_id)
);

-- INSERT : Les utilisateurs peuvent créer leurs propres relations (pour accepter des invitations)
CREATE POLICY "Users can insert their own company_users" ON public.company_users
FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE : Les admins peuvent mettre à jour toutes les relations
CREATE POLICY "Admins can update company_users" ON public.company_users
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE : Les admins de company peuvent mettre à jour les membres
CREATE POLICY "Company admins can update company_users" ON public.company_users
FOR UPDATE 
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- DELETE : Les admins peuvent supprimer toutes les relations
CREATE POLICY "Admins can delete company_users" ON public.company_users
FOR DELETE USING (public.is_admin(auth.uid()));

-- DELETE : Les admins de company peuvent supprimer des membres
CREATE POLICY "Company admins can delete company_users" ON public.company_users
FOR DELETE USING (
  public.is_company_admin(auth.uid(), company_id)
);

-- DELETE : Les utilisateurs peuvent se retirer d'une entreprise
CREATE POLICY "Users can delete their own company_users" ON public.company_users
FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 10. POLICIES RLS POUR invitations
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les invitations
CREATE POLICY "Admins can view all invitations" ON public.invitations
FOR SELECT USING (public.is_admin(auth.uid()));

-- SELECT : Les admins de company peuvent voir les invitations de leur company
CREATE POLICY "Company admins can view invitations" ON public.invitations
FOR SELECT USING (
  public.is_company_admin(auth.uid(), company_id)
);

-- SELECT : Les utilisateurs peuvent voir les invitations qu'ils ont envoyées
CREATE POLICY "Users can view invitations they sent" ON public.invitations
FOR SELECT USING (invited_by = auth.uid());

-- SELECT : N'importe qui peut voir une invitation par token (pour la page d'acceptation)
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
FOR SELECT USING (true);

-- INSERT : Les admins peuvent créer des invitations
CREATE POLICY "Admins can create invitations" ON public.invitations
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- INSERT : Les admins de company peuvent créer des invitations
CREATE POLICY "Company admins can create invitations" ON public.invitations
FOR INSERT WITH CHECK (
  public.is_company_admin(auth.uid(), company_id)
);

-- UPDATE : Les admins peuvent mettre à jour toutes les invitations
CREATE POLICY "Admins can update invitations" ON public.invitations
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE : Les admins de company peuvent mettre à jour les invitations de leur company
CREATE POLICY "Company admins can update invitations" ON public.invitations
FOR UPDATE 
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- =====================================================
-- 11. FONCTION POUR AJOUTER AUTOMATIQUEMENT L'UTILISATEUR À SA COMPANY
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_user_to_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si owner_id est défini, ajouter automatiquement l'utilisateur à la company
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour ajouter automatiquement l'owner à la company
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_to_company();

-- =====================================================
-- 12. TRIGGER updated_at POUR companies
-- =====================================================

CREATE OR REPLACE FUNCTION update_companies_updated_at()
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
  EXECUTE FUNCTION update_companies_updated_at();

-- =====================================================
-- 13. TRIGGER updated_at POUR invitations
-- =====================================================

CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- =====================================================
-- 14. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT SELECT ON public.company_users TO anon;

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon;

-- =====================================================
-- 15. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SYSTÈME COMPANIES RECONSTRUIT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées :';
  RAISE NOTICE '  ✅ companies';
  RAISE NOTICE '  ✅ company_users';
  RAISE NOTICE '  ✅ invitations';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées :';
  RAISE NOTICE '  ✅ is_admin()';
  RAISE NOTICE '  ✅ is_company_admin()';
  RAISE NOTICE '  ✅ add_user_to_company()';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS activé avec policies pour :';
  RAISE NOTICE '  ✅ Admins globaux : accès complet';
  RAISE NOTICE '  ✅ Admins de company : gestion de leur company';
  RAISE NOTICE '  ✅ Utilisateurs : accès à leurs données';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers créés :';
  RAISE NOTICE '  ✅ on_company_created : ajoute automatiquement owner à company_users';
  RAISE NOTICE '  ✅ update_companies_updated_at';
  RAISE NOTICE '  ✅ update_invitations_updated_at';
  RAISE NOTICE '';
  RAISE NOTICE 'Le système est prêt !';
  RAISE NOTICE '========================================';
END $$;
