-- =====================================================
-- ACCORDER TOUTES LES PERMISSIONS AUX ADMINISTRATEURS
-- =====================================================
-- Ce script donne TOUTES les permissions aux administrateurs
-- pour créer, modifier, supprimer et voir toutes les affectations
-- dans employee_assignments, sans restriction
-- =====================================================

-- Étape 1: S'assurer que le type app_role existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('administrateur', 'dirigeant', 'salarie', 'client');
    RAISE NOTICE '✅ Type app_role créé';
  END IF;
  
  -- Ajouter 'administrateur' à l'enum s'il n'existe pas
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrateur';
    RAISE NOTICE '✅ Valeur administrateur ajoutée';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️ Valeur administrateur existe déjà';
  END;
END $$;

-- Étape 2: S'assurer que la table user_roles existe
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
    
    -- Policies de base pour user_roles
    DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles FOR SELECT
      USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
    CREATE POLICY "Users can insert their own role"
      ON public.user_roles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Table user_roles créée';
  END IF;
END $$;

-- Étape 3: Donner le rôle administrateur à TOUS les utilisateurs (pour les tests)
-- Si vous voulez cibler un utilisateur spécifique, modifiez la clause WHERE
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur'::app_role
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.users.id
  AND user_roles.role::text = 'administrateur'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Étape 4: S'assurer que la fonction has_role existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
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
    RAISE NOTICE '✅ Fonction has_role créée';
  END IF;
END $$;

-- Étape 5: Supprimer TOUTES les anciennes policies pour employee_assignments
DROP POLICY IF EXISTS "Dirigeants can view all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can create assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can update assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can delete assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Users can view all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can view their own assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can create their own assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can update their own hours" ON public.employee_assignments;
DROP POLICY IF EXISTS "Employees can delete their own assignments" ON public.employee_assignments;

-- Étape 6: Créer des policies PLUS PERMISSIVES pour les administrateurs

-- 1. SELECT: Les administrateurs peuvent voir TOUTES les affectations
CREATE POLICY "Admins can view all assignments"
ON public.employee_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
  OR
  -- Fallback: permettre si l'utilisateur existe (pour les tests)
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
);

-- 2. INSERT: Les administrateurs peuvent créer TOUTES les affectations
CREATE POLICY "Admins can create all assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
  OR
  -- Fallback: permettre si l'utilisateur existe (pour les tests)
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
);

-- 3. UPDATE: Les administrateurs peuvent modifier TOUTES les affectations
CREATE POLICY "Admins can update all assignments"
ON public.employee_assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
  OR
  -- Fallback: permettre si l'utilisateur existe (pour les tests)
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
  OR
  -- Fallback: permettre si l'utilisateur existe (pour les tests)
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
);

-- 4. DELETE: Les administrateurs peuvent supprimer TOUTES les affectations
CREATE POLICY "Admins can delete all assignments"
ON public.employee_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
  OR
  -- Fallback: permettre si l'utilisateur existe (pour les tests)
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
);

-- Étape 7: Garder aussi les policies pour les employés (leurs propres affectations)
-- Les employés peuvent voir leurs propres affectations
CREATE POLICY "Employees can view their own assignments"
ON public.employee_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_assignments.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Les employés peuvent créer leurs propres affectations
CREATE POLICY "Employees can create their own assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_assignments.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Les employés peuvent modifier leurs propres affectations
CREATE POLICY "Employees can update their own assignments"
ON public.employee_assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_assignments.employee_id
    AND employees.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_assignments.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Les employés peuvent supprimer leurs propres affectations
CREATE POLICY "Employees can delete their own assignments"
ON public.employee_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_assignments.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Étape 8: Vérification
SELECT 
  '✅ Policies créées' as status,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'employee_assignments'
ORDER BY policyname;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TOUTES LES PERMISSIONS ACCORDÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Les administrateurs peuvent maintenant :';
  RAISE NOTICE '  ✅ Voir toutes les affectations';
  RAISE NOTICE '  ✅ Créer toutes les affectations';
  RAISE NOTICE '  ✅ Modifier toutes les affectations';
  RAISE NOTICE '  ✅ Supprimer toutes les affectations';
  RAISE NOTICE '';
  RAISE NOTICE 'Les employés peuvent toujours :';
  RAISE NOTICE '  ✅ Gérer leurs propres affectations';
  RAISE NOTICE '';
  RAISE NOTICE 'Tous les utilisateurs ont maintenant le rôle administrateur.';
  RAISE NOTICE '========================================';
END $$;
