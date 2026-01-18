-- =====================================================
-- PERMISSIONS COMPLÈTES POUR TOUS LES UTILISATEURS (TEST)
-- =====================================================
-- ⚠️ SCRIPT DE TEST - À UTILISER UNIQUEMENT EN DÉVELOPPEMENT
-- Ce script donne TOUTES les permissions à TOUS les utilisateurs
-- authentifiés pour créer, modifier, supprimer et voir toutes
-- les affectations dans employee_assignments
-- =====================================================

-- Supprimer TOUTES les anciennes policies
DROP POLICY IF EXISTS "Dirigeants can view all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can create assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can update assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can delete assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can create all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can update all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can delete all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Users can view all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can view their own assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can create their own assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can update their own hours" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can delete their own assignments" ON public.employee_assignments;

-- =====================================================
-- POLICIES PERMISSIVES POUR TOUS LES UTILISATEURS
-- =====================================================

-- 1. TOUS les utilisateurs authentifiés peuvent voir TOUTES les affectations
CREATE POLICY "All authenticated users can view all assignments"
ON public.employee_assignments FOR SELECT
USING (
  -- Permettre si l'utilisateur est authentifié
  auth.uid() IS NOT NULL
  OR
  -- Ou s'il a un rôle administrateur/dirigeant dans user_roles
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
);

-- 2. TOUS les utilisateurs authentifiés peuvent créer TOUTES les affectations
CREATE POLICY "All authenticated users can create all assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  -- Permettre si l'utilisateur est authentifié
  auth.uid() IS NOT NULL
  OR
  -- Ou s'il a un rôle administrateur/dirigeant dans user_roles
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
);

-- 3. TOUS les utilisateurs authentifiés peuvent modifier TOUTES les affectations
CREATE POLICY "All authenticated users can update all assignments"
ON public.employee_assignments FOR UPDATE
USING (
  -- Permettre si l'utilisateur est authentifié
  auth.uid() IS NOT NULL
  OR
  -- Ou s'il a un rôle administrateur/dirigeant dans user_roles
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
)
WITH CHECK (
  -- Même vérification pour WITH CHECK
  auth.uid() IS NOT NULL
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
);

-- 4. TOUS les utilisateurs authentifiés peuvent supprimer TOUTES les affectations
CREATE POLICY "All authenticated users can delete all assignments"
ON public.employee_assignments FOR DELETE
USING (
  -- Permettre si l'utilisateur est authentifié
  auth.uid() IS NOT NULL
  OR
  -- Ou s'il a un rôle administrateur/dirigeant dans user_roles
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
);

-- =====================================================
-- ASSURER QUE TOUS LES UTILISATEURS ONT LE RÔLE ADMINISTRATEUR
-- =====================================================

-- S'assurer que le type app_role existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('administrateur', 'dirigeant', 'salarie', 'client');
    RAISE NOTICE '✅ Type app_role créé';
  END IF;
  
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrateur';
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

-- S'assurer que la table user_roles existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      role app_role NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id, role)
    );
    
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    -- Policies permissives pour user_roles aussi
    DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles FOR SELECT
      USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);
    
    DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
    CREATE POLICY "Users can insert their own role"
      ON public.user_roles FOR INSERT
      WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);
    
    RAISE NOTICE '✅ Table user_roles créée avec policies permissives';
  END IF;
END $$;

-- Donner le rôle administrateur à TOUS les utilisateurs
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur'::app_role
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.users.id
  AND user_roles.role::text = 'administrateur'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

SELECT 
  '✅ Policies créées' as status,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'employee_assignments'
ORDER BY policyname;

-- Vérifier les rôles des utilisateurs
SELECT 
  '📋 Rôles utilisateurs' as status,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.email, ur.role;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PERMISSIONS COMPLÈTES ACCORDÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  MODE TEST ACTIVÉ';
  RAISE NOTICE '';
  RAISE NOTICE 'TOUS les utilisateurs authentifiés peuvent maintenant :';
  RAISE NOTICE '  ✅ Voir toutes les affectations';
  RAISE NOTICE '  ✅ Créer toutes les affectations';
  RAISE NOTICE '  ✅ Modifier toutes les affectations';
  RAISE NOTICE '  ✅ Supprimer toutes les affectations';
  RAISE NOTICE '';
  RAISE NOTICE 'Tous les utilisateurs ont maintenant le rôle administrateur.';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Ce script est pour les TESTS uniquement !';
  RAISE NOTICE '    Pour la production, utilisez ALLOW-ADMIN-ALL-ASSIGNMENTS.sql';
  RAISE NOTICE '========================================';
END $$;
