-- ============================================================================
-- 1) Mettre khalfallah.sndrc@gmail.com en dirigeant (owner) de l'entreprise batbat
-- 2) S'assurer que le rôle owner a les permissions employés (users.*) et intégrations
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_owner_role_id UUID;
  v_perm_id UUID;
BEGIN
  -- Récupérer l'utilisateur par email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER('khalfallah.sndrc@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Utilisateur khalfallah.sndrc@gmail.com non trouvé dans auth.users';
    RETURN;
  END IF;

  -- Récupérer l'entreprise batbat (nom insensible à la casse)
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE LOWER(TRIM(name)) = LOWER('batbat')
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '⚠️ Entreprise "batbat" non trouvée dans public.companies';
    RETURN;
  END IF;

  -- Récupérer le rôle owner (dirigeant) de cette entreprise
  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE company_id = v_company_id AND slug = 'owner'
  LIMIT 1;

  IF v_owner_role_id IS NULL THEN
    RAISE NOTICE '⚠️ Rôle owner non trouvé pour l''entreprise batbat. Création des rôles système si nécessaire.';
    -- Les rôles sont créés par seed_system_roles ou create_strict_rls - on ne les recrée pas ici
    RETURN;
  END IF;

  -- Mettre à jour ou insérer company_users : cet utilisateur devient dirigeant (owner)
  INSERT INTO public.company_users (company_id, user_id, role_id, status)
  VALUES (v_company_id, v_user_id, v_owner_role_id, 'active')
  ON CONFLICT (company_id, user_id)
  DO UPDATE SET role_id = v_owner_role_id, status = 'active', updated_at = now();

  RAISE NOTICE '✅ khalfallah.sndrc@gmail.com est maintenant dirigeant (owner) de l''entreprise batbat';
END $$;

-- ============================================================================
-- S'assurer que TOUS les rôles owner (dirigeants) ont les permissions users.*
-- et qu'aucune permission "intégrations" n'est requise côté DB (l'app utilise isOwner)
-- ============================================================================

-- Donner aux rôles owner qui n'ont pas encore toutes les permissions users.*
-- les permissions manquantes (users.read, users.invite, users.update, users.delete, users.update_role)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'owner'
  AND p.key IN ('users.read', 'users.invite', 'users.update', 'users.delete', 'users.update_role')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Vérification : compter les permissions owner pour la company batbat
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.role_permissions rp
  JOIN public.roles r ON r.id = rp.role_id
  JOIN public.companies c ON c.id = r.company_id
  WHERE r.slug = 'owner'
    AND LOWER(TRIM(c.name)) = LOWER('batbat');
  RAISE NOTICE '✅ Rôle owner batbat : % permission(s) associée(s)', v_count;
END $$;
