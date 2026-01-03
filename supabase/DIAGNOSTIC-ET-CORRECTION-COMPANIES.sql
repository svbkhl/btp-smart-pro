-- =====================================================
-- 🔍 DIAGNOSTIC ET CORRECTION - Table companies
-- =====================================================
-- Ce script vérifie ET corrige tout ce qui manque
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : Vérifier si la table existe
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'companies'
  ) THEN
    RAISE NOTICE '⚠️ La table companies n''existe pas. Création en cours...';
    
    -- Créer la table companies
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
    
    RAISE NOTICE '✅ Table companies créée !';
  ELSE
    RAISE NOTICE '✅ Table companies existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 2 : Créer les index
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

-- =====================================================
-- ÉTAPE 3 : Vérifier/Créer user_roles si nécessaire
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
  ) THEN
    RAISE NOTICE '⚠️ Table user_roles n''existe pas. Création en cours...';
    
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('administrateur', 'utilisateur')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(user_id, role)
    );
    
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
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
      );
    
    RAISE NOTICE '✅ Table user_roles créée !';
  ELSE
    RAISE NOTICE '✅ Table user_roles existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 4 : Vérifier/Créer company_users si nécessaire
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'company_users'
  ) THEN
    RAISE NOTICE '⚠️ Table company_users n''existe pas. Création en cours...';
    
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
    
    RAISE NOTICE '✅ Table company_users créée !';
  ELSE
    RAISE NOTICE '✅ Table company_users existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5 : Activer RLS sur companies
-- =====================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ÉTAPE 6 : Supprimer et recréer les policies companies
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;

-- Policy qui permet TOUT aux admins système
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    -- Pour SELECT/UPDATE/DELETE : vérifier si admin OU dans company_users
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
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- ÉTAPE 7 : Créer la fonction updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÉTAPE 8 : Créer le trigger
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_companies_updated_at();

-- =====================================================
-- ÉTAPE 9 : Vérifier que l'utilisateur actuel est admin
-- =====================================================
DO $$
DECLARE
  current_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Récupérer l'ID de l'utilisateur actuel
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Aucun utilisateur connecté dans ce contexte SQL';
  ELSE
    -- Vérifier si l'utilisateur est admin
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = current_user_id 
      AND role = 'administrateur'
    ) INTO is_admin;
    
    IF is_admin THEN
      RAISE NOTICE '✅ L''utilisateur actuel est administrateur';
    ELSE
      RAISE NOTICE '⚠️ L''utilisateur actuel N''EST PAS administrateur';
      RAISE NOTICE '💡 Pour créer des entreprises, tu dois avoir le rôle "administrateur" dans user_roles';
      RAISE NOTICE '💡 Exécute ce script pour te donner le rôle admin :';
      RAISE NOTICE '   INSERT INTO public.user_roles (user_id, role)';
      RAISE NOTICE '   SELECT id, ''administrateur'' FROM auth.users WHERE email = ''TON_EMAIL@example.com''';
      RAISE NOTICE '   ON CONFLICT (user_id, role) DO NOTHING;';
    END IF;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 10 : Rapport final
-- =====================================================
SELECT 
  '✅ DIAGNOSTIC TERMINÉ' as status,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') as table_companies_exists,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') as table_user_roles_exists,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_users') as table_company_users_exists,
  (SELECT COUNT(*) FROM public.companies) as nombre_entreprises;















