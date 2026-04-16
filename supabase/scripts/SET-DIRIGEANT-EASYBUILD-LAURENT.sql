-- ============================================================================
-- Promouvoir Laurent (easybuild.13@gmail.com) en dirigeant (owner + user_roles)
-- ============================================================================
-- Exécuter dans Supabase Dashboard → SQL Editor (une fois).
-- Met à jour : user_roles.dirigeant, company_users (role + role_id owner), employees.poste si présent.
-- ============================================================================

DO $$
DECLARE
  v_email TEXT := 'easybuild.13@gmail.com';
  v_user_id UUID;
  v_company_id UUID;
  v_owner_role_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable pour l''email %', v_email;
  END IF;

  RAISE NOTICE 'Utilisateur: % (id: %)', v_email, v_user_id;

  -- Rôle applicatif global (RLS / Auth)
  UPDATE public.user_roles SET role = 'dirigeant' WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'dirigeant');
  END IF;

  RAISE NOTICE 'user_roles → dirigeant';

  -- Chaque entreprise où il est déjà membre → owner RBAC
  FOR v_company_id IN
    SELECT DISTINCT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = v_user_id
  LOOP
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = v_company_id AND slug = 'owner'
    LIMIT 1;

    IF v_owner_role_id IS NULL THEN
      RAISE NOTICE 'Entreprise % : rôle owner introuvable (exécuter create_system_roles_for_company ?)', v_company_id;
      CONTINUE;
    END IF;

    UPDATE public.company_users
    SET
      role_id = v_owner_role_id,
      role = 'owner',
      status = 'active'
    WHERE company_id = v_company_id AND user_id = v_user_id;

    RAISE NOTICE 'company_users → owner pour company_id %', v_company_id;
  END LOOP;

  -- Libellé RH / liste admin (optionnel)
  UPDATE public.employees
  SET poste = 'Dirigeant'
  WHERE user_id = v_user_id AND company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = v_user_id
  );

  IF FOUND THEN
    RAISE NOTICE 'employees.poste → Dirigeant';
  END IF;

  RAISE NOTICE 'Terminé.';
END $$;

-- Vérification rapide
SELECT
  u.email,
  ur.role AS app_role,
  c.name AS entreprise,
  r.slug AS role_slug,
  cu.role AS cu_role_legacy,
  e.poste
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.company_users cu ON cu.user_id = u.id
LEFT JOIN public.companies c ON c.id = cu.company_id
LEFT JOIN public.roles r ON r.id = cu.role_id
LEFT JOIN public.employees e ON e.user_id = u.id AND e.company_id = cu.company_id
WHERE LOWER(u.email) = 'easybuild.13@gmail.com';
