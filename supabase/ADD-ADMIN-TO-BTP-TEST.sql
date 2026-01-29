-- =====================================================
-- AJOUTER LE COMPTE ADMIN À L'ENTREPRISE "BTP TEST"
-- =====================================================
-- Ce script lie sabri.khalfallah6@gmail.com à l'entreprise
-- "btp test" (ou la crée si elle n'existe pas) pour permettre
-- la création de liens de paiement sans erreur company_id null.
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

DO $$
DECLARE
  v_admin_user_id UUID;
  v_company_id UUID;
  v_has_status BOOLEAN;
BEGIN
  -- 1. Trouver l'ID de l'utilisateur admin
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'sabri.khalfallah6@gmail.com';

  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur sabri.khalfallah6@gmail.com non trouvé dans auth.users';
  END IF;

  RAISE NOTICE '✅ Utilisateur admin trouvé: %', v_admin_user_id;

  -- 2. Trouver l'entreprise "btp test" (insensible à la casse)
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE name ILIKE 'btp test'
     OR name ILIKE 'btp  test'
  LIMIT 1;

  -- Si pas trouvée, créer l'entreprise "BTP test"
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, owner_id)
    VALUES ('BTP test', v_admin_user_id)
    RETURNING id INTO v_company_id;
    RAISE NOTICE '✅ Entreprise "BTP test" créée: %', v_company_id;
  ELSE
    RAISE NOTICE '✅ Entreprise "btp test" trouvée: %', v_company_id;
  END IF;

  -- 3. Vérifier si company_users a la colonne status
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company_users'
      AND column_name = 'status'
  ) INTO v_has_status;

  -- 4. Ajouter ou mettre à jour l'admin dans company_users
  IF v_has_status THEN
    INSERT INTO public.company_users (company_id, user_id, role, status)
    VALUES (v_company_id, v_admin_user_id, 'owner', 'active')
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET role = 'owner', status = 'active';
  ELSE
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (v_company_id, v_admin_user_id, 'owner')
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET role = 'owner';
  END IF;

  RAISE NOTICE '✅ Compte admin ajouté à l''entreprise (role: owner)';
  RAISE NOTICE '📋 company_id: %', v_company_id;
  RAISE NOTICE '📋 user_id: %', v_admin_user_id;
END $$;

-- Vérification
SELECT
  c.id AS company_id,
  c.name AS company_name,
  cu.user_id,
  u.email,
  cu.role,
  cu.status
FROM public.companies c
JOIN public.company_users cu ON cu.company_id = c.id
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com';
