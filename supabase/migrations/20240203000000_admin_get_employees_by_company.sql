-- ============================================================================
-- FONCTION RPC : Permettre aux admins de voir les employés de n'importe quelle entreprise
-- ============================================================================

-- Créer une fonction qui permet aux admins de récupérer les employés d'une entreprise
-- même s'ils ne sont pas membres de cette entreprise
CREATE OR REPLACE FUNCTION public.admin_get_employees_by_company(target_company_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_id UUID,
  nom TEXT,
  prenom TEXT,
  poste TEXT,
  specialites TEXT[],
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuté avec les privilèges du créateur (bypass RLS)
AS $$
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Retourner tous les employés de l'entreprise cible
  -- La vérification des permissions admin est faite dans useEmployeesByCompany
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.company_id,
    e.nom,
    e.prenom,
    e.poste,
    e.specialites,
    e.email,
    e.created_at,
    e.updated_at
  FROM public.employees e
  WHERE e.company_id = target_company_id
  ORDER BY e.nom ASC;
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.admin_get_employees_by_company(UUID) TO authenticated;

-- Commentaire pour la documentation
COMMENT ON FUNCTION public.admin_get_employees_by_company IS 
'Permet aux admins de récupérer les employés de n''importe quelle entreprise. Bypass RLS avec SECURITY DEFINER.';
