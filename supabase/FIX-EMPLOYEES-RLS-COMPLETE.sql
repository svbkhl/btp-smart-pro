-- ============================================================================
-- 🔥 FIX COMPLET : Permissions RLS pour la table employees
-- ============================================================================
-- Problème: Erreur 403 lors de la création d'employés
-- Solution: Corriger les policies RLS pour utiliser le système company_users/roles
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Vérifier et ajouter company_id à employees si nécessaire
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ company_id ajouté à employees';
  ELSE
    RAISE NOTICE '✅ company_id existe déjà dans employees';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: Supprimer TOUTES les anciennes policies RLS
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'employees'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', pol.policyname);
    RAISE NOTICE '🗑️ Policy supprimée: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- ÉTAPE 3: Créer des policies RLS SÉCURISÉES basées sur company_users/roles
-- ============================================================================

-- Helper function pour vérifier si l'utilisateur est owner ou admin
CREATE OR REPLACE FUNCTION public.is_company_owner_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug IN ('owner', 'admin')
  );
$$;

-- Helper function pour obtenir company_id de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cu.company_id 
  FROM public.company_users cu 
  WHERE cu.user_id = auth.uid() 
  LIMIT 1;
$$;

-- Policy SELECT: Les owners/admins peuvent voir tous les employés de leur company
CREATE POLICY "Company owners and admins can view employees"
ON public.employees FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Owners et admins voient tous les employés de leur company
    (
      public.is_company_owner_or_admin()
      AND company_id = public.get_user_company_id()
    )
    -- Les employés voient leurs propres données
    OR user_id = auth.uid()
  )
);

-- Policy INSERT: Les owners/admins peuvent créer des employés dans leur company
CREATE POLICY "Company owners and admins can insert employees"
ON public.employees FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_company_owner_or_admin()
  AND company_id = public.get_user_company_id()
);

-- Policy UPDATE: Les owners/admins peuvent modifier tous les employés de leur company
-- Les employés peuvent modifier leurs propres données
CREATE POLICY "Company owners and admins can update employees"
ON public.employees FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Owners et admins peuvent modifier tous les employés de leur company
    (
      public.is_company_owner_or_admin()
      AND company_id = public.get_user_company_id()
    )
    -- Les employés peuvent modifier leurs propres données
    OR user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    (
      public.is_company_owner_or_admin()
      AND company_id = public.get_user_company_id()
    )
    OR user_id = auth.uid()
  )
);

-- Policy DELETE: Les owners/admins peuvent supprimer des employés de leur company
CREATE POLICY "Company owners and admins can delete employees"
ON public.employees FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND public.is_company_owner_or_admin()
  AND company_id = public.get_user_company_id()
);

-- ============================================================================
-- ÉTAPE 4: Mettre à jour les employés existants avec company_id
-- ============================================================================

-- Mettre à jour les employés existants qui n'ont pas de company_id
UPDATE public.employees e
SET company_id = (
  SELECT cu.company_id 
  FROM public.company_users cu 
  WHERE cu.user_id = e.user_id 
  LIMIT 1
)
WHERE e.company_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.company_users cu 
  WHERE cu.user_id = e.user_id
);

-- ============================================================================
-- ÉTAPE 5: Vérification finale
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  employees_without_company INTEGER;
BEGIN
  -- Compter les policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'employees';
  
  -- Compter les employés sans company_id
  SELECT COUNT(*) INTO employees_without_company
  FROM public.employees
  WHERE company_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX EMPLOYEES RLS TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vérification finale:';
  RAISE NOTICE '   - Policies RLS créées: %', policy_count;
  RAISE NOTICE '   - Employés sans company_id: %', employees_without_company;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Policies basées sur company_users/roles';
  RAISE NOTICE '✅ Owners et admins peuvent créer/modifier/supprimer';
  RAISE NOTICE '✅ Les employés peuvent voir/modifier leurs propres données';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF employees_without_company > 0 THEN
    RAISE WARNING '⚠️ ATTENTION: % employé(s) sans company_id !', employees_without_company;
  END IF;
END $$;
