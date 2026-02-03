-- ============================================================================
-- FIX IMMÉDIAT: Associer l'utilisateur à SK Agency (sans ON CONFLICT)
-- User ID: 58747d0e-8382-40e5-9c4c-5b930744ecb0
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID := '58747d0e-8382-40e5-9c4c-5b930744ecb0';
  v_company_id UUID;
  v_role_id UUID;
  v_existing_company_user UUID;
  v_existing_employee UUID;
BEGIN
  RAISE NOTICE '🔵 Début du fix pour SK Agency...';
  
  -- 1. Trouver l'entreprise SK Agency
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE name ILIKE '%SK Agency%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '⚠️ SK Agency non trouvé, recherche d''autres entreprises...';
    
    SELECT id INTO v_company_id
    FROM public.companies
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
      RAISE EXCEPTION '❌ Aucune entreprise trouvée';
    END IF;
  END IF;

  RAISE NOTICE '✅ Entreprise trouvée: %', v_company_id;

  -- 2. Vérifier si déjà dans company_users
  SELECT id INTO v_existing_company_user
  FROM public.company_users
  WHERE user_id = v_user_id AND company_id = v_company_id;

  IF v_existing_company_user IS NOT NULL THEN
    RAISE NOTICE '✅ Déjà dans company_users';
  ELSE
    -- Récupérer le rôle
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE slug = 'owner'
    LIMIT 1;

    -- Insérer dans company_users
    INSERT INTO public.company_users (user_id, company_id, role_id, status, created_at)
    VALUES (v_user_id, v_company_id, v_role_id, 'active', NOW());

    RAISE NOTICE '✅ Ajouté à company_users';
  END IF;

  -- 3. Vérifier si déjà dans employees
  SELECT id INTO v_existing_employee
  FROM public.employees
  WHERE user_id = v_user_id AND company_id = v_company_id;

  IF v_existing_employee IS NOT NULL THEN
    RAISE NOTICE '✅ Déjà dans employees';
    
    -- Mettre à jour juste les dates
    UPDATE public.employees
    SET updated_at = NOW()
    WHERE id = v_existing_employee;
  ELSE
    -- Insérer dans employees
    INSERT INTO public.employees (
      user_id, 
      company_id, 
      nom, 
      prenom, 
      email, 
      poste, 
      created_at, 
      updated_at
    )
    SELECT 
      v_user_id,
      v_company_id,
      COALESCE(raw_user_meta_data->>'last_name', raw_user_meta_data->>'nom', 'Utilisateur'),
      COALESCE(raw_user_meta_data->>'first_name', raw_user_meta_data->>'prenom', ''),
      email,
      'Propriétaire',
      NOW(),
      NOW()
    FROM auth.users
    WHERE id = v_user_id;

    RAISE NOTICE '✅ Ajouté à employees';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 FIX TERMINÉ AVEC SUCCÈS !';
  RAISE NOTICE '✅ Rechargez votre application maintenant !';
  
END $$;
