-- ============================================================================
-- RLS POLICIES: Système RBAC (Sécurité stricte) - VERSION CORRIGÉE
-- Description: Politiques de sécurité pour roles, permissions, role_permissions, audit_logs
-- Date: 2026-01-05
-- CORRECTION: Suppression de la dépendance à la colonne "status"
-- ============================================================================

-- ============================================================================
-- 1) RLS POLICIES: permissions
-- ============================================================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: Tous les utilisateurs authentifiés peuvent voir les permissions
CREATE POLICY "Authenticated users can view all permissions"
ON public.permissions FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: Impossible (géré uniquement par migrations)
-- Pas de policies publiques

COMMENT ON POLICY "Authenticated users can view all permissions" ON public.permissions 
IS 'Tous les utilisateurs authentifiés peuvent voir la liste des permissions disponibles';

-- ============================================================================
-- 2) RLS POLICIES: roles
-- ============================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- SELECT: Utilisateurs de la même entreprise
CREATE POLICY "Users can view roles of their company"
ON public.roles FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Seulement OWNER
CREATE POLICY "Only owners can create roles"
ON public.roles FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug = 'owner'
  )
);

-- UPDATE: Seulement OWNER, et pas les rôles système
CREATE POLICY "Only owners can update non-system roles"
ON public.roles FOR UPDATE
TO authenticated
USING (
  is_system = false AND
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug = 'owner'
  )
)
WITH CHECK (
  is_system = false AND
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug = 'owner'
  )
);

-- DELETE: Seulement OWNER, et pas les rôles système
CREATE POLICY "Only owners can delete non-system roles"
ON public.roles FOR DELETE
TO authenticated
USING (
  is_system = false AND
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug = 'owner'
  )
);

-- ============================================================================
-- 3) RLS POLICIES: role_permissions
-- ============================================================================

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: Utilisateurs de la même entreprise
CREATE POLICY "Users can view role permissions of their company"
ON public.role_permissions FOR SELECT
TO authenticated
USING (
  role_id IN (
    SELECT r.id
    FROM public.roles r
    WHERE r.company_id IN (
      SELECT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Seulement OWNER, et pas sur les rôles système
CREATE POLICY "Only owners can assign permissions to non-system roles"
ON public.role_permissions FOR INSERT
TO authenticated
WITH CHECK (
  role_id IN (
    SELECT r.id
    FROM public.roles r
    WHERE r.is_system = false
    AND r.company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      JOIN public.roles r2 ON r2.id = cu.role_id
      WHERE cu.user_id = auth.uid()
      AND r2.slug = 'owner'
    )
  )
);

-- DELETE: Seulement OWNER, et pas sur les rôles système
CREATE POLICY "Only owners can remove permissions from non-system roles"
ON public.role_permissions FOR DELETE
TO authenticated
USING (
  role_id IN (
    SELECT r.id
    FROM public.roles r
    WHERE r.is_system = false
    AND r.company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      JOIN public.roles r2 ON r2.id = cu.role_id
      WHERE cu.user_id = auth.uid()
      AND r2.slug = 'owner'
    )
  )
);

-- ============================================================================
-- 4) RLS POLICIES: audit_logs
-- ============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Seulement OWNER
CREATE POLICY "Only owners can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug = 'owner'
  )
);

-- INSERT: Service role uniquement (via Edge Functions)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Pas de UPDATE/DELETE sur audit_logs (immutable)

-- ============================================================================
-- 5) MISE À JOUR RLS: company_users (ajouter vérification role_id)
-- ============================================================================

-- UPDATE: Empêcher un utilisateur de modifier son propre rôle
DROP POLICY IF EXISTS "Users can update their company profile" ON public.company_users;

CREATE POLICY "Users can update their company profile (not role)"
ON public.company_users FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- Un utilisateur ne peut jamais modifier son propre role_id
  (user_id = auth.uid() AND role_id = (SELECT role_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1))
  OR
  -- Seul OWNER/ADMIN peut modifier le role_id des autres
  (
    user_id != auth.uid() AND
    company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
    )
  )
);

-- ============================================================================
-- 6) MISE À JOUR RLS: invitations (vérifier permissions pour inviter)
-- ============================================================================

DROP POLICY IF EXISTS "Users can create invitations for their company" ON public.invitations;

CREATE POLICY "Only users with invite permission can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND public.check_user_permission(auth.uid(), cu.company_id, 'users.invite')
  )
);

-- ============================================================================
-- 7) VÉRIFICATION DES POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Compter les policies RBAC créées
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('permissions', 'roles', 'role_permissions', 'audit_logs');
  
  RAISE NOTICE '✅ % policies RLS créées pour le système RBAC', policy_count;
END $$;

-- ============================================================================
-- FIN DES RLS POLICIES
-- ============================================================================
