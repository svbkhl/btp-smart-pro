-- ═══════════════════════════════════════════════════════════════════════════
-- FIX "COMPANY ID MANQUANT" - Script Diagnostic et Réparation Automatique
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Ce script :
-- 1. Diagnostique pourquoi currentCompanyId est NULL
-- 2. Répare automatiquement le problème
-- 3. Affiche des messages clairs pour chaque étape
--
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_email TEXT := 'khalfallahs.ndrc@gmail.com'; -- 🔴 CHANGEZ VOTRE EMAIL ICI
  v_user_id UUID;
  v_sk_agency_id UUID;
  v_owner_role_id UUID;
  v_company_users_count INTEGER;
  v_employees_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSTIC: Company ID Manquant';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ÉTAPE 1 : Trouver l''utilisateur
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '📍 ÉTAPE 1 : Recherche de l''utilisateur...';
  
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ ERREUR : Utilisateur avec email "%" non trouvé', v_user_email;
  END IF;
  
  RAISE NOTICE '✅ Utilisateur trouvé : %', v_user_id;
  RAISE NOTICE '';
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ÉTAPE 2 : Trouver SK Agency
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '📍 ÉTAPE 2 : Recherche de SK Agency...';
  
  SELECT id INTO v_sk_agency_id
  FROM public.companies
  WHERE name ILIKE '%SK Agency%'
  LIMIT 1;
  
  IF v_sk_agency_id IS NULL THEN
    RAISE EXCEPTION '❌ ERREUR : SK Agency non trouvée dans la table companies';
  END IF;
  
  RAISE NOTICE '✅ SK Agency trouvée : %', v_sk_agency_id;
  RAISE NOTICE '';
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ÉTAPE 3 : Vérifier company_users
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '📍 ÉTAPE 3 : Vérification de company_users...';
  
  SELECT COUNT(*) INTO v_company_users_count
  FROM public.company_users
  WHERE user_id = v_user_id
    AND company_id = v_sk_agency_id;
  
  IF v_company_users_count = 0 THEN
    RAISE NOTICE '❌ Utilisateur NON trouvé dans company_users';
    RAISE NOTICE '🔧 Ajout automatique dans company_users...';
    
    -- Trouver le rôle owner
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE slug = 'owner'
    LIMIT 1;
    
    -- Ajouter dans company_users
    INSERT INTO public.company_users (user_id, company_id, role_id)
    VALUES (v_user_id, v_sk_agency_id, v_owner_role_id)
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    RAISE NOTICE '✅ Utilisateur ajouté dans company_users';
  ELSE
    RAISE NOTICE '✅ Utilisateur déjà présent dans company_users';
  END IF;
  
  RAISE NOTICE '';
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ÉTAPE 4 : Vérifier employees
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '📍 ÉTAPE 4 : Vérification de employees...';
  
  SELECT COUNT(*) INTO v_employees_count
  FROM public.employees
  WHERE user_id = v_user_id
    AND company_id = v_sk_agency_id;
  
  IF v_employees_count = 0 THEN
    RAISE NOTICE '❌ Utilisateur NON trouvé dans employees';
    RAISE NOTICE '🔧 Ajout automatique dans employees...';
    
    -- Ajouter dans employees
    INSERT INTO public.employees (
      user_id,
      company_id,
      nom,
      prenom,
      email,
      poste,
      statut,
      created_at,
      updated_at
    )
    SELECT
      v_user_id,
      v_sk_agency_id,
      COALESCE(u.raw_user_metadata->>'last_name', u.raw_user_metadata->>'nom', 'Utilisateur'),
      COALESCE(u.raw_user_metadata->>'first_name', u.raw_user_metadata->>'prenom', ''),
      u.email,
      'Propriétaire',
      'actif',
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.id = v_user_id
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    RAISE NOTICE '✅ Utilisateur ajouté dans employees';
  ELSE
    RAISE NOTICE '✅ Utilisateur déjà présent dans employees';
  END IF;
  
  RAISE NOTICE '';
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- RÉSUMÉ FINAL
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ RÉPARATION TERMINÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé :';
  RAISE NOTICE '  • Utilisateur : %', v_user_email;
  RAISE NOTICE '  • User ID : %', v_user_id;
  RAISE NOTICE '  • Company ID : %', v_sk_agency_id;
  RAISE NOTICE '  • Dans company_users : OUI ✓';
  RAISE NOTICE '  • Dans employees : OUI ✓';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Actions suivantes :';
  RAISE NOTICE '  1. Rechargez votre application (Ctrl+R)';
  RAISE NOTICE '  2. Le currentCompanyId devrait maintenant être défini';
  RAISE NOTICE '  3. L''erreur "Company ID manquant" devrait disparaître';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
END $$;
