-- ============================================================================
-- FONCTION RPC AMÉLIORÉE : Récupérer les utilisateurs avec leurs noms
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
    r.slug as role_slug,
    r.name as role_name,
    COALESCE(e.nom, au.raw_user_meta_data->>'nom', 'Non défini') as nom,
    COALESCE(e.prenom, au.raw_user_meta_data->>'prenom', au.raw_user_meta_data->>'first_name', '') as prenom,
    COALESCE(e.email, au.email, '') as email,
    COALESCE(e.poste, r.name, 'Non défini') as poste,
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
'Récupère les utilisateurs d''une entreprise avec leurs noms depuis employees ou auth.users metadata. Bypass RLS.';
