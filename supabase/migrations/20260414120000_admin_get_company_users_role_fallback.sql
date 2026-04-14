-- ============================================================================
-- admin_get_company_users : libellés rôle / poste quand role_id est NULL
-- ============================================================================
-- Si company_users.role_id ne joint pas public.roles (rôles non générés ou
-- ancienne ligne), on affichait "Non défini" pour poste et pas de rôle.
-- On retombe sur company_users.role (owner / member / admin) avec des libellés FR.
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_get_company_users(UUID);

CREATE OR REPLACE FUNCTION public.admin_get_company_users(target_company_id UUID)
RETURNS TABLE (
  user_id UUID,
  company_id UUID,
  role_id UUID,
  role_slug TEXT,
  role_name TEXT,
  nom TEXT,
  prenom TEXT,
  email TEXT,
  poste TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  RETURN QUERY
  SELECT
    cu.user_id,
    cu.company_id,
    cu.role_id,
    COALESCE(
      r.slug,
      CASE cu.role::text
        WHEN 'owner' THEN 'owner'
        WHEN 'member' THEN 'member'
        WHEN 'admin' THEN 'admin'
        ELSE NULL
      END
    ) AS role_slug,
    COALESCE(
      r.name,
      CASE cu.role::text
        WHEN 'owner' THEN 'Dirigeant'
        WHEN 'member' THEN 'Employé'
        WHEN 'admin' THEN 'Administrateur'
        ELSE NULL
      END
    ) AS role_name,
    COALESCE(e.nom, au.raw_user_meta_data->>'nom', 'Non défini') AS nom,
    COALESCE(e.prenom, au.raw_user_meta_data->>'prenom', au.raw_user_meta_data->>'first_name', '') AS prenom,
    COALESCE(e.email, au.email, '') AS email,
    COALESCE(
      e.poste,
      r.name,
      CASE cu.role::text
        WHEN 'owner' THEN 'Dirigeant'
        WHEN 'member' THEN 'Employé'
        WHEN 'admin' THEN 'Administrateur'
        ELSE NULL
      END,
      '—'
    ) AS poste,
    cu.created_at
  FROM public.company_users cu
  LEFT JOIN public.roles r ON r.id = cu.role_id
  LEFT JOIN public.employees e ON e.user_id = cu.user_id AND e.company_id = cu.company_id
  LEFT JOIN auth.users au ON au.id = cu.user_id
  WHERE cu.company_id = target_company_id
  ORDER BY cu.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_company_users(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_get_company_users IS
  'Membres entreprise (admin/closer) : noms + rôle, avec repli sur company_users.role si role_id absent.';
