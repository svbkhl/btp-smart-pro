-- =====================================================
-- 🔍 VÉRIFIER ET CORRIGER TOUT
-- =====================================================
-- Ce script vérifie l'état actuel et corrige ce qui manque
-- =====================================================

-- =====================================================
-- VÉRIFICATION 1 : Table companies
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'companies'
  ) THEN
    RAISE NOTICE '⚠️ Table companies n''existe pas. Création...';
    
    CREATE TABLE public.companies (
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
    
    CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
    CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);
    
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ Table companies créée !';
  ELSE
    RAISE NOTICE '✅ Table companies existe déjà';
  END IF;
END $$;

-- =====================================================
-- VÉRIFICATION 2 : Table user_roles
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
  ) THEN
    RAISE NOTICE '⚠️ Table user_roles n''existe pas. Création...';
    
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('administrateur', 'utilisateur')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(user_id, role)
    );
    
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ Table user_roles créée !';
  ELSE
    RAISE NOTICE '✅ Table user_roles existe déjà';
  END IF;
  
  -- Ajouter la contrainte UNIQUE si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_key'
    AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
    RAISE NOTICE '✅ Contrainte UNIQUE ajoutée à user_roles';
  END IF;
END $$;

-- =====================================================
-- VÉRIFICATION 3 : Table company_users
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'company_users'
  ) THEN
    RAISE NOTICE '⚠️ Table company_users n''existe pas. Création...';
    
    CREATE TABLE public.company_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(company_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users(role);
    
    ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ Table company_users créée !';
  ELSE
    RAISE NOTICE '✅ Table company_users existe déjà';
  END IF;
END $$;

-- =====================================================
-- CORRECTION 1 : RLS Policies pour user_roles
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

CREATE POLICY "Users can create their own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- CORRECTION 2 : RLS Policies pour companies
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;

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
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- CORRECTION 3 : RLS Policies pour company_users
-- =====================================================
DROP POLICY IF EXISTS "Users can view their company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can manage company_users" ON public.company_users;

CREATE POLICY "Users can view their company_users"
  ON public.company_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage company_users"
  ON public.company_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- CORRECTION 4 : Fonction et trigger pour companies
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_companies_updated_at();

-- =====================================================
-- CORRECTION 5 : Donner le rôle admin
-- =====================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur' 
FROM auth.users 
WHERE email = 'sabri.khalfallah6@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- RAPPORT FINAL
-- =====================================================
SELECT 
  '✅ VÉRIFICATION TERMINÉE' as status,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') as companies_exists,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') as user_roles_exists,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_users') as company_users_exists,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'administrateur') as nombre_admins;

-- Vérification des admins
SELECT 
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'administrateur';














