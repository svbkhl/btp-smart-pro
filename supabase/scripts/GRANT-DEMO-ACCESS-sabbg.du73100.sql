-- =====================================================
-- ACCORDER L'ACCÈS DÉMO À sabbg.du73100@gmail.com
-- =====================================================
-- Crée une entreprise avec abonnement actif (comme si l'utilisateur
-- avait payé) pour servir de démo du compte après souscription.
--
-- PRÉREQUIS : L'utilisateur sabbg.du73100@gmail.com doit d'abord
-- s'inscrire sur l'app (Page Auth → Créer un compte).
--
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_has_status BOOLEAN;
  v_has_role_id BOOLEAN;
  v_owner_role_id UUID;
BEGIN
  -- 1. Trouver l'ID de l'utilisateur
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER('sabbg.du73100@gmail.com');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur sabbg.du73100@gmail.com non trouvé. L''utilisateur doit d''abord s''inscrire sur l''app (page Auth → Créer un compte).';
  END IF;

  RAISE NOTICE '✅ Utilisateur trouvé: %', v_user_id;

  -- 2. Chercher une entreprise existante pour cet utilisateur
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE owner_id = v_user_id
  LIMIT 1;

  -- 3. Créer l'entreprise si elle n'existe pas
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, owner_id, subscription_status, trial_end, current_period_end, cancel_at_period_end)
    VALUES ('Démo BTP Smart Pro', v_user_id, 'active', (NOW() + INTERVAL '30 days')::timestamptz, (NOW() + INTERVAL '1 year')::timestamptz, false)
    RETURNING id INTO v_company_id;
    RAISE NOTICE '✅ Entreprise créée: %', v_company_id;
  ELSE
    RAISE NOTICE '✅ Entreprise existante trouvée: %', v_company_id;
  END IF;

  -- 4. Mettre à jour l'abonnement (activer comme si payé)
  UPDATE public.companies
  SET
    subscription_status = 'active',
    trial_end = (NOW() + INTERVAL '30 days')::timestamptz,
    current_period_end = (NOW() + INTERVAL '1 year')::timestamptz,
    cancel_at_period_end = false
  WHERE id = v_company_id;

  -- 5. Vérifier la structure de company_users
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_users' AND column_name = 'status'
  ) INTO v_has_status;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_users' AND column_name = 'role_id'
  ) INTO v_has_role_id;

  -- 6. Ajouter l'utilisateur comme owner dans company_users
  IF v_has_role_id THEN
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = v_company_id AND slug = 'owner'
    LIMIT 1;

    IF v_owner_role_id IS NOT NULL AND v_has_status THEN
      INSERT INTO public.company_users (company_id, user_id, role_id, role, status)
      VALUES (v_company_id, v_user_id, v_owner_role_id, 'owner', 'active')
      ON CONFLICT (company_id, user_id)
      DO UPDATE SET role_id = v_owner_role_id, role = 'owner', status = 'active';
    ELSIF v_owner_role_id IS NOT NULL THEN
      INSERT INTO public.company_users (company_id, user_id, role_id, role)
      VALUES (v_company_id, v_user_id, v_owner_role_id, 'owner')
      ON CONFLICT (company_id, user_id)
      DO UPDATE SET role_id = v_owner_role_id, role = 'owner';
    ELSE
      IF v_has_status THEN
        INSERT INTO public.company_users (company_id, user_id, role, status)
        VALUES (v_company_id, v_user_id, 'owner', 'active')
        ON CONFLICT (company_id, user_id)
        DO UPDATE SET role = 'owner', status = 'active';
      ELSE
        INSERT INTO public.company_users (company_id, user_id, role)
        VALUES (v_company_id, v_user_id, 'owner')
        ON CONFLICT (company_id, user_id)
        DO UPDATE SET role = 'owner';
      END IF;
    END IF;
  ELSIF v_has_status THEN
    INSERT INTO public.company_users (company_id, user_id, role, status)
    VALUES (v_company_id, v_user_id, 'owner', 'active')
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET role = 'owner', status = 'active';
  ELSE
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (v_company_id, v_user_id, 'owner')
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET role = 'owner';
  END IF;

  RAISE NOTICE '✅ Accès démo accordé : sabbg.du73100@gmail.com peut se connecter et accéder au dashboard';
  RAISE NOTICE '📋 company_id: %', v_company_id;
END $$;

-- Vérification
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.subscription_status,
  c.trial_end,
  c.current_period_end,
  u.email,
  cu.role
FROM public.companies c
JOIN public.company_users cu ON cu.company_id = c.id
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email = 'sabbg.du73100@gmail.com';
