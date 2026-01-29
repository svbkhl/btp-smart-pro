-- ============================================================================
-- RPC: get_company_users_with_profile
-- Retourne les membres d'une entreprise avec email et rôle sans exposer auth.users
-- (embed auth.users depuis public → 400). Vérifie que l'appelant est membre.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_company_users_with_profile(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_id UUID,
  role_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  email TEXT,
  raw_user_meta_data JSONB,
  role_pk UUID,
  role_name TEXT,
  role_slug TEXT,
  role_color TEXT,
  role_is_system BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    cu.id,
    cu.user_id,
    cu.company_id,
    cu.role_id,
    cu.status,
    cu.created_at,
    u.email,
    u.raw_user_meta_data,
    r.id AS role_pk,
    r.name AS role_name,
    r.slug AS role_slug,
    r.color AS role_color,
    r.is_system AS role_is_system
  FROM public.company_users cu
  LEFT JOIN auth.users u ON u.id = cu.user_id
  LEFT JOIN public.roles r ON r.id = cu.role_id
  WHERE cu.company_id = p_company_id
    AND cu.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.company_users me
      WHERE me.company_id = p_company_id
        AND me.user_id = auth.uid()
        AND me.status = 'active'
    )
  ORDER BY cu.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_company_users_with_profile(UUID) IS
  'Liste des membres entreprise avec email et rôle (accès réservé aux membres)';

GRANT EXECUTE ON FUNCTION public.get_company_users_with_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_users_with_profile(UUID) TO service_role;
