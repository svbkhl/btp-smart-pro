-- ============================================================================
-- Fallback: owner with role_id null still gets all permissions
-- When company_users.role = 'owner' but role_id is null (e.g. after accept-invite),
-- get_user_permissions should return all permissions so UI and RLS behave correctly.
-- ============================================================================

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
  -- Permissions from role (role_id join)
  role_perms AS (
    SELECT DISTINCT p.key
    FROM company_users cu
    JOIN roles r ON r.id = cu.role_id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = user_uuid
      AND cu.company_id = company_uuid
    UNION
    -- Fallback: owner by company_users.role when role_id is null
    SELECT p.key FROM permissions p
    WHERE EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = user_uuid
        AND cu.company_id = company_uuid
        AND cu.role = 'owner'
        AND cu.role_id IS NULL
    )
  ),
  custom_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = true
  ),
  revoked_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = false
  )
  SELECT key FROM (
    SELECT key FROM role_perms
    UNION
    SELECT key FROM custom_perms
  ) combined_perms
  WHERE key NOT IN (SELECT key FROM revoked_perms);
END;
$$;

COMMENT ON FUNCTION public.get_user_permissions_with_custom IS
  'Permissions (rôle + personnalisées - révoquées). Inclut fallback owner quand role_id est null.';
