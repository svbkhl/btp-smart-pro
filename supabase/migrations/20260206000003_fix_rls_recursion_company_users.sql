-- =====================================================
-- Fix: récursion infinie RLS sur company_users
-- =====================================================
-- Les policies qui font SELECT sur company_users dans leur
-- USING/WITH CHECK provoquent une récursion. On utilise des
-- fonctions SECURITY DEFINER qui bypassent RLS.
-- =====================================================

-- 1. Fonction : company_ids où l'utilisateur est membre (actif)
CREATE OR REPLACE FUNCTION public.get_my_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  AND (status = 'active' OR status IS NULL);
$$;

COMMENT ON FUNCTION public.get_my_company_ids() IS 'RLS helper: companies où auth.uid() est membre (actif). Ne pas utiliser en dehors des policies.';

-- 2. Fonction : company_ids où l'utilisateur est owner
CREATE OR REPLACE FUNCTION public.get_owner_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  AND role = 'owner';
$$;

COMMENT ON FUNCTION public.get_owner_company_ids() IS 'RLS helper: companies où auth.uid() est owner. Ne pas utiliser en dehors des policies.';

-- 3. company_users : remplacer les policies qui provoquent la récursion
DROP POLICY IF EXISTS "Owners can manage company_users" ON public.company_users;
DROP POLICY IF EXISTS "Members can view company users" ON public.company_users;
DROP POLICY IF EXISTS "Owners and admins can add company users" ON public.company_users;
DROP POLICY IF EXISTS "Owners and admins can update company users" ON public.company_users;
DROP POLICY IF EXISTS "Owners and admins can delete company users" ON public.company_users;

-- SELECT : tout membre (actif) peut voir les lignes de ses companies
CREATE POLICY "Members can view company users"
  ON public.company_users FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT get_my_company_ids()));

-- INSERT : seul un owner peut ajouter des utilisateurs à sa company
CREATE POLICY "Owners can add company users"
  ON public.company_users FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT get_owner_company_ids()));

-- UPDATE : membre peut mettre à jour (ex. son profil) dans sa company ; owner gère les rôles
CREATE POLICY "Members can update company users in their company"
  ON public.company_users FOR UPDATE
  TO authenticated
  USING (company_id IN (SELECT get_my_company_ids()))
  WITH CHECK (company_id IN (SELECT get_my_company_ids()));

-- DELETE : seul un owner peut retirer des utilisateurs de sa company
CREATE POLICY "Owners can delete company users"
  ON public.company_users FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT get_owner_company_ids()));

-- 4. companies : éviter la récursion (policy qui lit company_users)
DROP POLICY IF EXISTS "Owners can manage their company" ON public.companies;
CREATE POLICY "Owners can manage their company"
  ON public.companies FOR ALL
  USING (id IN (SELECT get_owner_company_ids()))
  WITH CHECK (id IN (SELECT get_owner_company_ids()));

-- 5. invitations : utiliser la fonction au lieu d'un subquery sur company_users
DROP POLICY IF EXISTS "Owners can create invitations" ON public.invitations;
CREATE POLICY "Owners can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (company_id IN (SELECT get_owner_company_ids()));

DROP POLICY IF EXISTS "Owners can view company invitations" ON public.invitations;
CREATE POLICY "Owners can view company invitations"
  ON public.invitations FOR SELECT
  USING (
    company_id IN (SELECT get_owner_company_ids())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update company invitations" ON public.invitations;
CREATE POLICY "Owners can update company invitations"
  ON public.invitations FOR UPDATE
  USING (company_id IN (SELECT get_owner_company_ids()))
  WITH CHECK (company_id IN (SELECT get_owner_company_ids()));
