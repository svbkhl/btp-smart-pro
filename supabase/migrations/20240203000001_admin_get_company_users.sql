-- ============================================================================
-- FONCTION RPC : Récupérer les utilisateurs d'une entreprise (admin)
-- ============================================================================

-- Supprimer d'abord si elle existe (CREATE OR REPLACE ne permet pas de changer le type de retour)
DROP FUNCTION IF EXISTS public.admin_get_company_users(UUID);

-- Fonction pour récupérer les utilisateurs d'une entreprise depuis company_users
CREATE FUNCTION public.admin_get_company_users(target_company_id UUID)
RETURNS TABLE (
  user_id UUID,
  company_id UUID,
  role_id UUID,
  role_slug TEXT,
  role_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Retourner tous les utilisateurs de l'entreprise avec leurs rôles
  RETURN QUERY
  SELECT 
    cu.user_id,
    cu.company_id,
    cu.role_id,
    r.slug as role_slug,
    r.name as role_name,
    cu.created_at
  FROM public.company_users cu
  LEFT JOIN public.roles r ON r.id = cu.role_id
  WHERE cu.company_id = target_company_id
  ORDER BY cu.created_at DESC;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.admin_get_company_users(UUID) TO authenticated;

-- Documentation
COMMENT ON FUNCTION public.admin_get_company_users IS 
'Permet aux admins de récupérer les utilisateurs d''une entreprise depuis company_users. Bypass RLS avec SECURITY DEFINER.';
