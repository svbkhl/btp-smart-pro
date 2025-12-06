-- =====================================================
-- SCRIPT URGENT - CORRECTION RLS COMPANIES
-- =====================================================
-- Ce script corrige les problèmes RLS pour la création d'entreprises
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER ET CRÉER LA FONCTION is_admin()
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
-- 2. S'ASSURER QUE L'UTILISATEUR SABRI A LE RÔLE ADMIN
-- =====================================================

DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'sabri.khalfallah6@gmail.com';
BEGIN
  -- Trouver l'ID de l'utilisateur
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Utilisateur % non trouvé', target_email;
  END IF;
  
  -- Insérer ou mettre à jour le rôle admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'admin'::app_role;
  
  RAISE NOTICE '✅ Rôle admin accordé à %', target_email;
END $$;

-- =====================================================
-- 3. SUPPRIMER TOUTES LES ANCIENNES POLICIES companies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Owners can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;

-- =====================================================
-- 4. RECRÉER LES POLICIES RLS POUR companies
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les entreprises
CREATE POLICY "Admins can view all companies" ON public.companies
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- SELECT : Les utilisateurs peuvent voir les entreprises où ils sont owner
CREATE POLICY "Users can view their own companies" ON public.companies
FOR SELECT 
USING (owner_id = auth.uid());

-- INSERT : Les admins peuvent créer des entreprises (PRIORITAIRE)
-- Cette policy doit permettre l'insertion même si owner_id est NULL
CREATE POLICY "Admins can insert companies" ON public.companies
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

-- INSERT : Les utilisateurs peuvent créer des entreprises (ils deviennent owner)
-- Cette policy permet l'insertion si owner_id = auth.uid() OU si owner_id est NULL
CREATE POLICY "Users can insert companies" ON public.companies
FOR INSERT 
WITH CHECK (
  owner_id = auth.uid() 
  OR owner_id IS NULL
);

-- UPDATE : Les admins peuvent modifier toutes les entreprises
CREATE POLICY "Admins can update companies" ON public.companies
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE : Les propriétaires peuvent modifier leurs entreprises
CREATE POLICY "Owners can update their companies" ON public.companies
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE : Les admins peuvent supprimer toutes les entreprises
CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- =====================================================
-- 5. VÉRIFIER QUE LA TABLE companies EXISTE
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
-- 6. GRANT PERMISSIONS POUR L'API REST
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;

-- =====================================================
-- 7. CRÉER LE TRIGGER updated_at
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
-- 8. TESTER QUE LA FONCTION is_admin() FONCTIONNE
-- =====================================================

DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'sabri.khalfallah6@gmail.com';
  is_admin_result BOOLEAN;
BEGIN
  -- Trouver l'ID de l'utilisateur
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Utilisateur % non trouvé', target_email;
  ELSE
    -- Tester la fonction is_admin
    SELECT public.is_admin(target_user_id) INTO is_admin_result;
    
    IF is_admin_result THEN
      RAISE NOTICE '✅ La fonction is_admin() fonctionne correctement pour %', target_email;
    ELSE
      RAISE NOTICE '❌ ERREUR: La fonction is_admin() retourne FALSE pour %', target_email;
      RAISE NOTICE '   Vérifiez que le rôle admin est bien dans user_roles';
    END IF;
  END IF;
END $$;

-- =====================================================
-- 9. AFFICHER LES INFORMATIONS DE L'UTILISATEUR
-- =====================================================

SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ ADMINISTRATEUR'
    ELSE '❌ MEMBRE'
  END as status,
  public.is_admin(u.id) as is_admin_function_result
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com';

-- =====================================================
-- 10. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT EXÉCUTÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Corrections appliquées :';
  RAISE NOTICE '  ✅ Fonction is_admin() créée/vérifiée';
  RAISE NOTICE '  ✅ Rôle admin accordé à sabri.khalfallah6@gmail.com';
  RAISE NOTICE '  ✅ Policies RLS pour companies recréées';
  RAISE NOTICE '  ✅ Permissions API REST accordées';
  RAISE NOTICE '';
  RAISE NOTICE 'Vous pouvez maintenant créer des entreprises !';
  RAISE NOTICE 'Rafraîchissez votre application et réessayez.';
  RAISE NOTICE '========================================';
END $$;





