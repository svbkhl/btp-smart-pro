-- ============================================================================
-- RPC : get_current_user_display_name
-- ============================================================================
-- Retourne le nom d'affichage de l'utilisateur connecté.
-- Priorité : table employees (prenom, nom) > auth.users metadata
-- Bypass RLS (SECURITY DEFINER) pour éviter les incohérences quand l'employé
-- voit "Henry" (user_metadata) au lieu de "Islam Slimani" (employees).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_display_name(p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  first_name TEXT,
  last_name TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_prenom TEXT;
  v_nom TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- 1. Déterminer le company_id à utiliser
  v_company_id := p_company_id;
  IF v_company_id IS NULL THEN
    SELECT cu.company_id INTO v_company_id
    FROM public.company_users cu
    WHERE cu.user_id = v_user_id
    ORDER BY cu.created_at ASC
    LIMIT 1;
  END IF;

  -- 2. Chercher dans employees (priorité)
  IF v_company_id IS NOT NULL THEN
    SELECT e.prenom, e.nom INTO v_prenom, v_nom
    FROM public.employees e
    WHERE e.user_id = v_user_id AND e.company_id = v_company_id
    LIMIT 1;
  END IF;

  IF v_prenom IS NULL AND v_nom IS NULL THEN
    -- Pas trouvé avec company_id, essayer sans (n'importe quelle company)
    SELECT e.prenom, e.nom INTO v_prenom, v_nom
    FROM public.employees e
    WHERE e.user_id = v_user_id
    ORDER BY e.company_id
    LIMIT 1;
  END IF;

  -- 3. Si trouvé dans employees, utiliser ces valeurs
  IF (v_prenom IS NOT NULL AND TRIM(v_prenom) != '') OR (v_nom IS NOT NULL AND TRIM(v_nom) != '') THEN
    v_first_name := COALESCE(TRIM(v_prenom), '');
    v_last_name := COALESCE(TRIM(v_nom), '');
    v_full_name := TRIM(v_first_name || ' ' || v_last_name);
    RETURN QUERY SELECT v_first_name, v_last_name, v_full_name;
    RETURN;
  END IF;

  -- 4. Fallback : auth.users metadata
  SELECT
    COALESCE(
      au.raw_user_meta_data->>'prenom',
      au.raw_user_meta_data->>'first_name',
      ''
    ),
    COALESCE(
      au.raw_user_meta_data->>'nom',
      au.raw_user_meta_data->>'last_name',
      ''
    )
  INTO v_first_name, v_last_name
  FROM auth.users au
  WHERE au.id = v_user_id;

  v_first_name := COALESCE(TRIM(v_first_name), '');
  v_last_name := COALESCE(TRIM(v_last_name), '');
  v_full_name := TRIM(v_first_name || ' ' || v_last_name);
  IF v_full_name = '' THEN
    SELECT email INTO v_full_name FROM auth.users WHERE id = v_user_id;
  END IF;

  RETURN QUERY SELECT v_first_name, v_last_name, v_full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_display_name(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_current_user_display_name(UUID) IS
'Retourne le nom d''affichage de l''utilisateur connecté. Priorité: employees > auth metadata. SECURITY DEFINER pour bypass RLS.';
