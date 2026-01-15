-- ============================================================================
-- CORRECTION : Fonction accept_invitation pour utiliser role_id
-- ============================================================================
-- Ce script corrige la fonction accept_invitation pour qu'elle utilise role_id
-- au lieu de role dans company_users
-- ============================================================================

-- Fonction: Accepter une invitation (VERSION CORRIGÉE)
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

  -- Priorité 1 : Utiliser role_id de l'invitation si disponible
  IF v_invitation.role_id IS NOT NULL THEN
    v_role_id := v_invitation.role_id;
  ELSE
    -- Priorité 2 : Déterminer le role_slug basé sur v_invitation.role
    -- Mapping: owner -> owner, admin -> admin, member -> employee
    IF v_invitation.role = 'owner' THEN
      v_role_slug := 'owner';
    ELSIF v_invitation.role = 'admin' THEN
      v_role_slug := 'admin';
    ELSE
      v_role_slug := 'employee';
    END IF;

    -- Récupérer le role_id depuis la table roles
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE slug = v_role_slug
    LIMIT 1;
  END IF;

  -- Assigner l'utilisateur à l'entreprise avec role_id
  INSERT INTO public.company_users (company_id, user_id, role_id)
  VALUES (v_invitation.company_id, p_user_id, v_role_id)
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

  RETURN v_invitation.company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION accept_invitation(TEXT, UUID) IS 'Accepte une invitation et assigne l''utilisateur à l''entreprise avec le bon role_id';

-- Vérification
SELECT '✅ Fonction accept_invitation corrigée avec succès' AS status;
