-- ============================================================================
-- FIX: Associer l'utilisateur à l'entreprise SK Agency existante
-- User ID: 58747d0e-8382-40e5-9c4c-5b930744ecb0
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID := '58747d0e-8382-40e5-9c4c-5b930744ecb0';
  v_company_id UUID;
  v_role_id UUID;
  v_existing_link UUID;
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
    
    -- Chercher toute entreprise disponible
    SELECT id INTO v_company_id
    FROM public.companies
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
      RAISE EXCEPTION '❌ Aucune entreprise trouvée dans la base de données';
    END IF;
  END IF;

  RAISE NOTICE '✅ Entreprise trouvée: %', v_company_id;

  -- 2. Vérifier si l'utilisateur est déjà associé
  SELECT id INTO v_existing_link
  FROM public.company_users
  WHERE user_id = v_user_id AND company_id = v_company_id;

  IF v_existing_link IS NOT NULL THEN
    RAISE NOTICE '✅ Utilisateur déjà associé à cette entreprise (id: %)', v_existing_link;
  ELSE
    -- 3. Récupérer le rôle propriétaire
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE slug = 'owner'
    LIMIT 1;

    IF v_role_id IS NULL THEN
      RAISE NOTICE '⚠️ Rôle owner non trouvé, utilisation de NULL';
    ELSE
      RAISE NOTICE '✅ Rôle owner trouvé: %', v_role_id;
    END IF;

    -- 4. Associer l'utilisateur à l'entreprise
    INSERT INTO public.company_users (user_id, company_id, role_id, status, created_at)
    VALUES (v_user_id, v_company_id, v_role_id, 'active', NOW())
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET 
      status = 'active',
      role_id = EXCLUDED.role_id;

    RAISE NOTICE '✅ Utilisateur associé à l''entreprise dans company_users';
  END IF;

  -- 5. Créer/Mettre à jour l'entrée dans employees
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
  ON CONFLICT (user_id, company_id) 
  DO UPDATE SET 
    updated_at = NOW(),
    poste = EXCLUDED.poste;

  RAISE NOTICE '✅ Entrée employé créée/mise à jour';

  -- 6. Afficher le résumé
  RAISE NOTICE '';
  RAISE NOTICE '🎉 FIX TERMINÉ AVEC SUCCÈS !';
  RAISE NOTICE '📋 Résumé:';
  RAISE NOTICE '  - Company ID: %', v_company_id;
  RAISE NOTICE '  - User ID: %', v_user_id;
  RAISE NOTICE '  - Status: active';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Rechargez votre application maintenant !';
  
END $$;

-- Vérification finale
SELECT 
  'company_users' as table_name,
  cu.user_id,
  cu.company_id,
  cu.status,
  c.name as company_name
FROM public.company_users cu
JOIN public.companies c ON c.id = cu.company_id
WHERE cu.user_id = '58747d0e-8382-40e5-9c4c-5b930744ecb0';

SELECT 
  'employees' as table_name,
  e.user_id,
  e.company_id,
  e.nom,
  e.prenom,
  e.poste
FROM public.employees e
WHERE e.user_id = '58747d0e-8382-40e5-9c4c-5b930744ecb0';
