-- ============================================================================
-- FIX: Créer une entreprise et associer l'utilisateur
-- User ID: 58747d0e-8382-40e5-9c4c-5b930744ecb0
-- ============================================================================

-- 1. Créer une entreprise par défaut (si elle n'existe pas déjà)
DO $$
DECLARE
  v_company_id UUID;
  v_user_id UUID := '58747d0e-8382-40e5-9c4c-5b930744ecb0';
  v_role_id UUID;
  v_existing_company_id UUID;
BEGIN
  -- Vérifier si l'utilisateur a déjà une entreprise
  SELECT company_id INTO v_existing_company_id
  FROM public.company_users
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_existing_company_id IS NOT NULL THEN
    RAISE NOTICE 'L''utilisateur est déjà associé à une entreprise (%)
', v_existing_company_id;
    RETURN;
  END IF;

  -- Créer une nouvelle entreprise
  INSERT INTO public.companies (name, created_at, updated_at)
  VALUES ('Mon Entreprise BTP', NOW(), NOW())
  RETURNING id INTO v_company_id;

  RAISE NOTICE 'Entreprise créée avec ID: %', v_company_id;

  -- Récupérer le rôle "propriétaire"
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE slug = 'owner'
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE NOTICE 'Rôle owner non trouvé, utilisation de NULL';
  END IF;

  -- Associer l'utilisateur à l'entreprise
  INSERT INTO public.company_users (user_id, company_id, role_id, status, created_at)
  VALUES (v_user_id, v_company_id, v_role_id, 'active', NOW());

  RAISE NOTICE 'Utilisateur associé à l''entreprise';

  -- Créer/Mettre à jour l'entrée dans employees
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
  WHERE id = v_user_id
  ON CONFLICT (user_id, company_id) DO UPDATE
  SET 
    updated_at = NOW(),
    poste = EXCLUDED.poste;

  RAISE NOTICE 'Entrée employé créée/mise à jour';
  RAISE NOTICE 'FIX TERMINÉ AVEC SUCCÈS !';
  RAISE NOTICE 'Company ID: %', v_company_id;
  
END $$;
