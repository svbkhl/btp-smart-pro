-- =====================================================
-- ACCORDER TOUTES LES PERMISSIONS AUX ADMINISTRATEURS
-- =====================================================
-- Ce script donne toutes les permissions aux administrateurs
-- pour créer, modifier, supprimer et voir toutes les affectations
-- dans employee_assignments
-- =====================================================

-- Supprimer les anciennes policies pour les administrateurs
DROP POLICY IF EXISTS "Dirigeants can view all assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can create assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can update assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Dirigeants can delete assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.employee_assignments;
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.employee_assignments;

-- =====================================================
-- POLICIES POUR ADMINISTRATEURS/DIRIGEANTS
-- =====================================================

-- 1. Les administrateurs peuvent voir TOUTES les affectations
CREATE POLICY "Admins can view all assignments"
ON public.employee_assignments FOR SELECT
USING (
  -- Vérifier dans user_roles (méthode principale)
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  -- Vérifier avec has_role si la fonction existe et si le type app_role existe
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
);

-- 2. Les administrateurs peuvent créer TOUTES les affectations
CREATE POLICY "Admins can create all assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  -- Vérifier dans user_roles (méthode principale)
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  -- Vérifier avec has_role si la fonction existe et si le type app_role existe
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
);

-- 3. Les administrateurs peuvent modifier TOUTES les affectations
CREATE POLICY "Admins can update all assignments"
ON public.employee_assignments FOR UPDATE
USING (
  -- Vérifier dans user_roles (méthode principale)
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  -- Vérifier avec has_role si la fonction existe et si le type app_role existe
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
)
WITH CHECK (
  -- Même vérification pour WITH CHECK
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
);

-- 4. Les administrateurs peuvent supprimer TOUTES les affectations
CREATE POLICY "Admins can delete all assignments"
ON public.employee_assignments FOR DELETE
USING (
  -- Vérifier dans user_roles (méthode principale)
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role::text IN ('administrateur', 'dirigeant', 'admin')
  )
  OR
  -- Vérifier avec has_role si la fonction existe et si le type app_role existe
  (
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    AND (
      public.has_role(auth.uid(), 'dirigeant'::app_role) 
      OR public.has_role(auth.uid(), 'administrateur'::app_role)
    )
  )
);

-- =====================================================
-- VÉRIFICATION
-- =====================================================

SELECT 
  '✅ Policies pour administrateurs créées' as status,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'employee_assignments'
  AND policyname LIKE '%Admin%'
ORDER BY policyname;

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Toutes les permissions ont été accordées aux administrateurs pour employee_assignments';
  RAISE NOTICE 'ℹ️ Les administrateurs peuvent maintenant créer, modifier, supprimer et voir toutes les affectations';
END $$;
