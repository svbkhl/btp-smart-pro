-- ============================================================================
-- Faire Henry (sabbg.du73100@gmail.com) patron de son entreprise
-- ============================================================================
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_owner_role_id UUID;
BEGIN
  -- Récupérer l'ID d'Henry
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'sabbg.du73100@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur sabbg.du73100@gmail.com non trouvé';
  END IF;

  -- Récupérer la company : d'Henry, sinon celle où un owner existe (Wanys)
  SELECT company_id INTO v_company_id
  FROM company_users
  WHERE user_id = v_user_id AND company_id IS NOT NULL
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM company_users
    WHERE role = 'owner' AND company_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Henry n''est dans aucune entreprise. Utilisez d''abord APPLIQUER-PLANNING-TOUS-EMPLOYES.sql';
  END IF;

  -- D'abord : mettre l'ancien patron en member
  UPDATE company_users
  SET role = 'member'
  WHERE company_id = v_company_id AND user_id != v_user_id AND role = 'owner';

  -- Mettre Henry en owner (UPDATE ou INSERT)
  UPDATE company_users SET role = 'owner', company_id = v_company_id
  WHERE user_id = v_user_id AND (company_id = v_company_id OR company_id IS NULL);
  IF NOT FOUND THEN
    BEGIN
      INSERT INTO company_users (company_id, user_id, role)
      VALUES (v_company_id, v_user_id, 'owner');
    EXCEPTION WHEN unique_violation THEN
      UPDATE company_users SET role = 'owner' WHERE user_id = v_user_id AND company_id = v_company_id;
    END;
  END IF;

  -- Mettre à jour companies.owner_id si la colonne existe
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='owner_id') THEN
    UPDATE companies SET owner_id = v_user_id WHERE id = v_company_id;
  END IF;

  -- Assigner role_id owner si la table roles existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='roles') THEN
    SELECT id INTO v_owner_role_id FROM roles WHERE company_id = v_company_id AND slug = 'owner' LIMIT 1;
    IF v_owner_role_id IS NOT NULL THEN
      UPDATE company_users SET role_id = v_owner_role_id WHERE user_id = v_user_id AND company_id = v_company_id;
    END IF;
  END IF;

  RAISE NOTICE '✅ Henry (sabbg.du73100@gmail.com) est maintenant patron de l''entreprise %', v_company_id;
END $$;
