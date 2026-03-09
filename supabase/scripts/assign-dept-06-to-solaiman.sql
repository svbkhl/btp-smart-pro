-- Assigner tous les leads du département 06 à solaiman.ouladmoussa@gmail.com

DO $$
DECLARE
  v_new_owner_id UUID;
  v_updated INTEGER;
BEGIN
  SELECT id INTO v_new_owner_id
  FROM auth.users
  WHERE LOWER(email) = LOWER('solaiman.ouladmoussa@gmail.com')
  LIMIT 1;

  IF v_new_owner_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé : solaiman.ouladmoussa@gmail.com';
  END IF;

  UPDATE public.leads
  SET owner_id = v_new_owner_id
  WHERE dept_code = '06';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Leads du 06 assignés à solaiman.ouladmoussa@gmail.com : %', v_updated;
END $$;
