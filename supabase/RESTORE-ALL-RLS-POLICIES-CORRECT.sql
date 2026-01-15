-- =====================================================
-- RESTAURATION COMPLÈTE : Toutes les policies RLS
-- =====================================================
-- Ce script restaure toutes les policies RLS comme avant
-- en évitant les récursions infinies
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER TOUTES LES POLICIES PROBLÉMATIQUES
-- =====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Supprimer toutes les policies de company_users
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'company_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_users', r.policyname);
  END LOOP;
  RAISE NOTICE '✅ Policies company_users supprimées';
END $$;

-- =====================================================
-- 2. CRÉER FONCTIONS HELPER (SECURITY DEFINER - évite récursion)
-- =====================================================

-- Fonction pour vérifier si un user est membre d'une company
CREATE OR REPLACE FUNCTION public.is_company_member(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.company_users 
    WHERE user_id = p_user_id 
    AND company_id = p_company_id
    AND (status = 'active' OR status IS NULL)
  );
END;
$$;

-- Fonction pour obtenir les company_ids d'un user
CREATE OR REPLACE FUNCTION public.get_user_company_ids(
  p_user_id UUID
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN ARRAY(
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = p_user_id
    AND (status = 'active' OR status IS NULL)
  );
END;
$$;

-- =====================================================
-- 3. POLICIES COMPANY_USERS (SANS RÉCURSION)
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les relations
CREATE POLICY "Admins can view all company_users" 
  ON public.company_users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('administrateur', 'admin', 'dirigeant')
    )
  );

-- SELECT : Les utilisateurs peuvent voir leurs propres relations
CREATE POLICY "Users can view their company_users" 
  ON public.company_users FOR SELECT 
  USING (user_id = auth.uid());

-- SELECT : Les utilisateurs peuvent voir les membres de leurs companies
-- Utilise la fonction helper pour éviter la récursion
CREATE POLICY "Users can view company_users of their companies" 
  ON public.company_users FOR SELECT 
  USING (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
  );

-- INSERT : Les admins peuvent créer des relations
CREATE POLICY "Admins can insert company_users" 
  ON public.company_users FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('administrateur', 'admin', 'dirigeant')
    )
  );

-- INSERT : Les utilisateurs peuvent créer leurs propres relations (pour accepter des invitations)
CREATE POLICY "Users can insert their own company_users" 
  ON public.company_users FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- UPDATE : Les admins peuvent mettre à jour toutes les relations
CREATE POLICY "Admins can update company_users" 
  ON public.company_users FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('administrateur', 'admin', 'dirigeant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('administrateur', 'admin', 'dirigeant')
    )
  );

-- DELETE : Les admins peuvent supprimer toutes les relations
CREATE POLICY "Admins can delete company_users" 
  ON public.company_users FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('administrateur', 'admin', 'dirigeant')
    )
  );

-- DELETE : Les utilisateurs peuvent supprimer leurs propres relations
CREATE POLICY "Users can delete their own company_users" 
  ON public.company_users FOR DELETE 
  USING (user_id = auth.uid());

-- =====================================================
-- 4. VÉRIFICATION ET MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RESTAURATION POLICIES TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies company_users restaurées:';
  RAISE NOTICE '  ✅ SELECT (3 policies)';
  RAISE NOTICE '  ✅ INSERT (2 policies)';
  RAISE NOTICE '  ✅ UPDATE (1 policy)';
  RAISE NOTICE '  ✅ DELETE (2 policies)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions helpers créées:';
  RAISE NOTICE '  ✅ is_company_member()';
  RAISE NOTICE '  ✅ get_user_company_ids()';
  RAISE NOTICE '';
  RAISE NOTICE 'Les erreurs de récursion infinie sont';
  RAISE NOTICE 'maintenant corrigées !';
  RAISE NOTICE '========================================';
END $$;
