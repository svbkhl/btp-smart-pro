-- =====================================================
-- FIX : Récursion infinie dans policies RLS company_users
-- =====================================================
-- Ce script supprime toutes les policies problématiques
-- et les recrée SANS récursion en utilisant des fonctions SECURITY DEFINER
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER TOUTES LES POLICIES EXISTANTES
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
  RAISE NOTICE '✅ Toutes les policies company_users supprimées';
END $$;

-- =====================================================
-- 2. CRÉER FONCTIONS HELPER SANS RÉCURSION (SECURITY DEFINER)
-- =====================================================

-- Fonction pour vérifier si un user est membre d'une company
-- SECURITY DEFINER permet de bypasser RLS et éviter la récursion
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
    AND (status = 'active' OR status IS NULL) -- Support anciennes données sans status
  );
END;
$$;

-- Fonction pour vérifier si un user est admin/owner d'une company
CREATE OR REPLACE FUNCTION public.is_company_admin(
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
    AND role IN ('owner', 'admin')
    AND (status = 'active' OR status IS NULL)
  )
  OR EXISTS (
    SELECT 1 
    FROM public.companies 
    WHERE id = p_company_id 
    AND owner_id = p_user_id
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
-- 3. CRÉER POLICIES SANS RÉCURSION
-- =====================================================

-- SELECT : Les users peuvent voir les membres de leurs companies
-- Utilise la fonction helper pour éviter la récursion
CREATE POLICY "Users can view company_users of their companies"
  ON public.company_users FOR SELECT
  USING (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    OR user_id = auth.uid() -- Peut voir sa propre relation
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- INSERT : Seuls les admins système ou owners/admins de la company peuvent ajouter
CREATE POLICY "Admins and company owners can insert company_users"
  ON public.company_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR public.is_company_admin(auth.uid(), company_users.company_id)
    OR user_id = auth.uid() -- Permet aux users d'accepter des invitations
  );

-- UPDATE : Seuls les admins système ou owners/admins de la company peuvent modifier
CREATE POLICY "Admins and company owners can update company_users"
  ON public.company_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR public.is_company_admin(auth.uid(), company_users.company_id)
    OR user_id = auth.uid() -- Peut modifier sa propre relation
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR public.is_company_admin(auth.uid(), company_users.company_id)
    OR user_id = auth.uid()
  );

-- DELETE : Seuls les admins système ou owners/admins de la company peuvent supprimer
CREATE POLICY "Admins and company owners can delete company_users"
  ON public.company_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR public.is_company_admin(auth.uid(), company_users.company_id)
    OR user_id = auth.uid() -- Peut supprimer sa propre relation (quitter une company)
  );

-- =====================================================
-- 4. VÉRIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX RÉCURSION COMPANY_USERS TERMINÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  ✅ is_company_member()';
  RAISE NOTICE '  ✅ is_company_admin()';
  RAISE NOTICE '  ✅ get_user_company_ids()';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies recréées SANS récursion:';
  RAISE NOTICE '  ✅ SELECT';
  RAISE NOTICE '  ✅ INSERT';
  RAISE NOTICE '  ✅ UPDATE';
  RAISE NOTICE '  ✅ DELETE';
  RAISE NOTICE '';
  RAISE NOTICE 'Les erreurs de récursion infinie devraient';
  RAISE NOTICE 'maintenant être résolues !';
  RAISE NOTICE '========================================';
END $$;
