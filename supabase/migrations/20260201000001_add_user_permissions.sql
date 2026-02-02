-- ============================================================================
-- MIGRATION: Système de permissions individuelles par employé
-- Description: Permet au patron de personnaliser les accès de chaque employé
-- Date: 2026-02-01
-- ============================================================================

-- ============================================================================
-- 1) TABLE: user_permissions (Permissions personnalisées par employé)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  
  -- État
  granted BOOLEAN NOT NULL DEFAULT true,
  
  -- Qui a accordé cette permission
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT user_permissions_unique UNIQUE(user_id, company_id, permission_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company_id ON public.user_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted ON public.user_permissions(granted);

-- Commentaires
COMMENT ON TABLE public.user_permissions IS 'Permissions individuelles personnalisées par employé';
COMMENT ON COLUMN public.user_permissions.granted IS 'true = accordée, false = révoquée';

-- ============================================================================
-- 2) RLS (Row Level Security) pour user_permissions
-- ============================================================================

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres permissions
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les owners peuvent voir toutes les permissions de leur entreprise
CREATE POLICY "Owners can view all user permissions"
  ON public.user_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

-- Policy: Les owners peuvent créer des permissions pour leur entreprise
CREATE POLICY "Owners can create user permissions"
  ON public.user_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

-- Policy: Les owners peuvent modifier les permissions de leur entreprise
CREATE POLICY "Owners can update user permissions"
  ON public.user_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

-- Policy: Les owners peuvent supprimer les permissions de leur entreprise
CREATE POLICY "Owners can delete user permissions"
  ON public.user_permissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

-- ============================================================================
-- 3) FUNCTION: get_user_permissions_with_custom (Nouvelle version)
-- ============================================================================

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.get_user_permissions_with_custom(UUID, UUID);

-- Créer la nouvelle fonction qui inclut les permissions personnalisées
CREATE OR REPLACE FUNCTION public.get_user_permissions_with_custom(
  user_uuid UUID,
  company_uuid UUID
)
RETURNS TABLE(permission_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Permissions du rôle
  role_perms AS (
    SELECT DISTINCT p.key
    FROM company_users cu
    JOIN roles r ON r.id = cu.role_id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = user_uuid
      AND cu.company_id = company_uuid
  ),
  -- Permissions personnalisées (granted = true)
  custom_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = true
  ),
  -- Permissions révoquées (granted = false)
  revoked_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = false
  )
  -- Combiner : (permissions du rôle UNION permissions personnalisées) EXCEPT permissions révoquées
  SELECT key FROM (
    SELECT key FROM role_perms
    UNION
    SELECT key FROM custom_perms
  ) combined_perms
  WHERE key NOT IN (SELECT key FROM revoked_perms);
END;
$$;

-- Commentaire
COMMENT ON FUNCTION public.get_user_permissions_with_custom IS 'Récupère toutes les permissions (rôle + personnalisées - révoquées)';

-- ============================================================================
-- 4) Modifier la fonction RPC existante pour utiliser la nouvelle logique
-- ============================================================================

-- Remplacer get_user_permissions pour utiliser la nouvelle logique
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  user_uuid UUID,
  company_uuid UUID
)
RETURNS TABLE(permission_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Utiliser la nouvelle fonction avec permissions personnalisées
  RETURN QUERY
  SELECT * FROM public.get_user_permissions_with_custom(user_uuid, company_uuid);
END;
$$;

-- ============================================================================
-- 5) Trigger pour updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_permissions_updated_at();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
