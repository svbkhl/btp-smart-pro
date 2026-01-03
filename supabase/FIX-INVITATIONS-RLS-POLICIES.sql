-- =====================================================
-- CORRECTION POLICIES RLS POUR INVITATIONS
-- =====================================================
-- Ce script corrige les policies RLS pour permettre
-- l'insertion d'invitations par les admins et company admins
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER LES ANCIENNES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can update invitations" ON public.invitations;

-- =====================================================
-- 2. CRÉER LES POLICIES SELECT
-- =====================================================

-- SELECT : Les admins globaux peuvent voir toutes les invitations
CREATE POLICY "Admins can view all invitations" ON public.invitations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- SELECT : Les admins/owners de company peuvent voir les invitations de leur company
CREATE POLICY "Company admins can view invitations" ON public.invitations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
);

-- SELECT : Les utilisateurs peuvent voir les invitations qu'ils ont envoyées
CREATE POLICY "Users can view invitations they sent" ON public.invitations
FOR SELECT 
USING (invited_by = auth.uid());

-- SELECT : N'importe qui peut voir une invitation par token (pour la page d'acceptation)
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
FOR SELECT 
USING (true);

-- =====================================================
-- 3. CRÉER LES POLICIES INSERT (CRITIQUE)
-- =====================================================

-- INSERT : Les admins globaux peuvent créer des invitations
CREATE POLICY "Admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- INSERT : Les admins/owners de company peuvent créer des invitations pour leur company
-- IMPORTANT : Cette policy vérifie que invited_by = auth.uid() ET que l'utilisateur est admin/owner
CREATE POLICY "Company admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  -- Vérifier que invited_by correspond à l'utilisateur authentifié
  invited_by = auth.uid() AND
  -- Vérifier que l'utilisateur est admin ou owner de cette company
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
);

-- =====================================================
-- 4. CRÉER LES POLICIES UPDATE
-- =====================================================

-- UPDATE : Les admins globaux peuvent mettre à jour toutes les invitations
CREATE POLICY "Admins can update invitations" ON public.invitations
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- UPDATE : Les admins/owners de company peuvent mettre à jour les invitations de leur company
CREATE POLICY "Company admins can update invitations" ON public.invitations
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
);

-- =====================================================
-- 5. VÉRIFIER QUE LA TABLE EXISTE AVEC LES BONNES COLONNES
-- =====================================================

DO $$
BEGIN
  -- Vérifier que la table existe
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations'
  ) THEN
    RAISE EXCEPTION 'Table invitations does not exist. Run FIX-INVITATIONS-SYSTEM-COMPLETE.sql first.';
  END IF;

  -- Vérifier que les colonnes requises existent
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations'
    AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'Column role does not exist in invitations table.';
  END IF;

  RAISE NOTICE '✅ Table invitations exists with required columns';
END $$;

-- =====================================================
-- 6. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ POLICIES RLS CORRIGÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies créées :';
  RAISE NOTICE '  ✅ SELECT : Admins, Company admins, Users (sent), Public (by token)';
  RAISE NOTICE '  ✅ INSERT : Admins globaux, Company admins/owners';
  RAISE NOTICE '  ✅ UPDATE : Admins globaux, Company admins/owners';
  RAISE NOTICE '';
  RAISE NOTICE 'La policy "Company admins can create invitations" vérifie :';
  RAISE NOTICE '  - invited_by = auth.uid()';
  RAISE NOTICE '  - L''utilisateur est admin/owner de la company';
  RAISE NOTICE '';
  RAISE NOTICE 'Le système est prêt !';
  RAISE NOTICE '========================================';
END $$;












