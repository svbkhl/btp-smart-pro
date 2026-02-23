-- ============================================================================
-- Fix accept_invitation : fallback company_id depuis invited_by si null
-- Quand un owner invite un employé, l'invitation doit avoir company_id.
-- Pour les invitations existantes sans company_id, on utilise l'entreprise de l'invitateur.
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
  v_company_id UUID;
  v_role_id UUID;
  v_role_slug TEXT;
BEGIN
  -- Récupérer l'invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expirée';
  END IF;

  -- Vérifier que l'email correspond
  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'L''email ne correspond pas à l''invitation';
  END IF;

  -- company_id : priorité 1 = invitation, priorité 2 = entreprise de l'invitateur
  v_company_id := v_invitation.company_id;
  IF v_company_id IS NULL AND v_invitation.invited_by IS NOT NULL THEN
    SELECT cu.company_id INTO v_company_id
    FROM public.company_users cu
    WHERE cu.user_id = v_invitation.invited_by
      AND cu.company_id IS NOT NULL
    LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de déterminer l''entreprise pour cette invitation (company_id manquant)';
  END IF;

  -- Priorité 1 : Utiliser role_id de l'invitation si disponible
  IF v_invitation.role_id IS NOT NULL THEN
    v_role_id := v_invitation.role_id;
  ELSE
    -- Priorité 2 : Déterminer le role_slug basé sur v_invitation.role
    IF v_invitation.role = 'owner' THEN
      v_role_slug := 'owner';
    ELSIF v_invitation.role = 'admin' THEN
      v_role_slug := 'admin';
    ELSE
      v_role_slug := 'employee';
    END IF;

    -- Récupérer le role_id depuis la table roles (filtré par company_id si possible)
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE slug = v_role_slug
      AND (company_id = v_company_id OR company_id IS NULL)
    ORDER BY (company_id = v_company_id) DESC
    LIMIT 1;
    
    -- Fallback : rôle global
    IF v_role_id IS NULL THEN
      SELECT id INTO v_role_id
      FROM public.roles
      WHERE slug = v_role_slug
      LIMIT 1;
    END IF;
  END IF;

  -- Assigner l'utilisateur à l'entreprise avec role_id
  INSERT INTO public.company_users (company_id, user_id, role_id)
  VALUES (v_company_id, p_user_id, v_role_id)
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET role_id = COALESCE(v_role_id, EXCLUDED.role_id);

  -- Mettre à jour l'invitation
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      user_id = p_user_id
  WHERE id = v_invitation.id;

  -- Assigner le rôle dans user_roles (pour compatibilité)
  IF v_invitation.role = 'owner' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'dirigeant')
    ON CONFLICT (user_id) DO UPDATE SET role = 'dirigeant';
  ELSIF v_invitation.role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'administrateur')
    ON CONFLICT (user_id) DO UPDATE SET role = 'administrateur';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'salarie')
    ON CONFLICT (user_id) DO UPDATE SET role = 'salarie';
  END IF;

  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_invitation(TEXT, UUID) IS 'Accepte une invitation et assigne l''utilisateur à l''entreprise. Fallback company_id depuis invited_by si null.';
