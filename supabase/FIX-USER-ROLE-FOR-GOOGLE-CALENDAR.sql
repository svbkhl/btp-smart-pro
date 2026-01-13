-- ============================================================================
-- FIX: Assigner le rôle OWNER/ADMIN pour permettre la connexion Google Calendar
-- ============================================================================
-- Ce script vérifie et assigne le rôle owner ou admin à un utilisateur
-- pour qu'il puisse connecter Google Calendar
-- ============================================================================
-- 
-- UTILISATION:
-- 1. Remplacez 'VOTRE_EMAIL@example.com' par votre email dans la variable user_email ci-dessous
-- 2. OU remplacez 'VOTRE_USER_ID' par votre UUID utilisateur dans la variable user_id_param
-- 3. Exécutez le script
-- ============================================================================

-- ============================================================================
-- CONFIGURATION: Modifiez ces valeurs selon vos besoins
-- ============================================================================

DO $$
DECLARE
  -- OPTION 1: Trouver l'utilisateur par email (recommandé)
  user_email TEXT := 'sabri.khalfallah6@gmail.com'; -- ⚠️ MODIFIEZ ICI avec votre email
  
  -- OPTION 2: Utiliser directement un user_id (si vous connaissez l'UUID)
  -- user_id_param UUID := NULL; -- ⚠️ OU décommentez et mettez votre UUID ici
  
  -- Variables internes
  current_user_id UUID;
  current_company_id UUID;
  owner_role_id UUID;
  admin_role_id UUID;
  existing_company_user RECORD;
BEGIN
  -- ============================================================================
  -- ÉTAPE 1: Trouver l'utilisateur
  -- ============================================================================
  
  -- Essayer d'abord avec auth.uid() (si exécuté depuis l'app)
  current_user_id := auth.uid();
  
  -- Si pas de session, utiliser l'email ou user_id_param
  IF current_user_id IS NULL THEN
    -- Si user_id_param est défini, l'utiliser
    -- IF user_id_param IS NOT NULL THEN
    --   current_user_id := user_id_param;
    -- ELSIF user_email IS NOT NULL THEN
    IF user_email IS NOT NULL THEN
      -- Trouver l'utilisateur par email
      SELECT id INTO current_user_id
      FROM auth.users
      WHERE email = user_email
      LIMIT 1;
      
      IF current_user_id IS NULL THEN
        RAISE EXCEPTION '❌ Aucun utilisateur trouvé avec l''email: %. Vérifiez l''email dans le script.', user_email;
      END IF;
      
      RAISE NOTICE '✅ Utilisateur trouvé par email (%): %', user_email, current_user_id;
    ELSE
      RAISE EXCEPTION '❌ Aucun utilisateur trouvé. Modifiez user_email ou user_id_param dans le script.';
    END IF;
  ELSE
    RAISE NOTICE '✅ Utilisateur connecté (session): %', current_user_id;
  END IF;
  
  -- Récupérer la première entreprise de l'utilisateur
  SELECT company_id INTO current_company_id
  FROM public.company_users
  WHERE user_id = current_user_id
  LIMIT 1;
  
  -- Si l'utilisateur n'a pas d'entreprise, essayer de trouver une entreprise
  IF current_company_id IS NULL THEN
    SELECT id INTO current_company_id
    FROM public.companies
    LIMIT 1;
    
    IF current_company_id IS NULL THEN
      RAISE EXCEPTION '❌ Aucune entreprise trouvée. Créez d''abord une entreprise.';
    END IF;
    
    RAISE NOTICE '⚠️  Aucune entrée dans company_users. Création d''une entrée pour l''entreprise: %', current_company_id;
  ELSE
    RAISE NOTICE '✅ Entreprise trouvée: %', current_company_id;
  END IF;
  
  -- ============================================================================
  -- ÉTAPE 3: Vérifier si les rôles système existent pour cette entreprise
  -- ============================================================================
  
  -- Récupérer le rôle OWNER
  SELECT id INTO owner_role_id
  FROM public.roles
  WHERE company_id = current_company_id
  AND slug = 'owner'
  LIMIT 1;
  
  -- Récupérer le rôle ADMIN
  SELECT id INTO admin_role_id
  FROM public.roles
  WHERE company_id = current_company_id
  AND slug = 'admin'
  LIMIT 1;
  
  -- Si les rôles n'existent pas, les créer
  IF owner_role_id IS NULL OR admin_role_id IS NULL THEN
    RAISE NOTICE '⚠️  Rôles système manquants. Création des rôles...';
    PERFORM public.create_system_roles_for_company(current_company_id);
    
    -- Récupérer à nouveau les IDs
    SELECT id INTO owner_role_id
    FROM public.roles
    WHERE company_id = current_company_id
    AND slug = 'owner'
    LIMIT 1;
    
    SELECT id INTO admin_role_id
    FROM public.roles
    WHERE company_id = current_company_id
    AND slug = 'admin'
    LIMIT 1;
  END IF;
  
  IF owner_role_id IS NULL THEN
    RAISE EXCEPTION '❌ Impossible de créer le rôle OWNER. Vérifiez les migrations.';
  END IF;
  
  RAISE NOTICE '✅ Rôle OWNER trouvé: %', owner_role_id;
  IF admin_role_id IS NOT NULL THEN
    RAISE NOTICE '✅ Rôle ADMIN trouvé: %', admin_role_id;
  END IF;
  
  -- ============================================================================
  -- ÉTAPE 3: Vérifier et mettre à jour company_users
  -- ============================================================================
  
  -- Vérifier si l'utilisateur a déjà une entrée dans company_users
  SELECT * INTO existing_company_user
  FROM public.company_users
  WHERE user_id = current_user_id
  AND company_id = current_company_id;
  
  IF existing_company_user IS NULL THEN
    -- Créer une nouvelle entrée avec le rôle OWNER
    INSERT INTO public.company_users (company_id, user_id, role_id)
    VALUES (current_company_id, current_user_id, owner_role_id)
    ON CONFLICT (company_id, user_id) DO UPDATE
    SET role_id = owner_role_id;
    
    RAISE NOTICE '✅ Entrée créée dans company_users avec le rôle OWNER';
  ELSIF existing_company_user.role_id IS NULL THEN
    -- Mettre à jour avec le rôle OWNER
    UPDATE public.company_users
    SET role_id = owner_role_id
    WHERE user_id = current_user_id
    AND company_id = current_company_id;
    
    RAISE NOTICE '✅ role_id assigné (OWNER) dans company_users';
  ELSE
    -- Vérifier si le rôle actuel est owner ou admin
    IF EXISTS (
      SELECT 1
      FROM public.roles r
      WHERE r.id = existing_company_user.role_id
      AND r.slug IN ('owner', 'admin')
    ) THEN
      RAISE NOTICE '✅ L''utilisateur a déjà le rôle owner ou admin. Aucune modification nécessaire.';
    ELSE
      -- Changer le rôle en OWNER
      UPDATE public.company_users
      SET role_id = owner_role_id
      WHERE user_id = current_user_id
      AND company_id = current_company_id;
      
      RAISE NOTICE '✅ Rôle changé en OWNER';
    END IF;
  END IF;
  
  -- ============================================================================
  -- ÉTAPE 5: Vérification finale
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ==========================================';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '✅ ==========================================';
  
  SELECT 
    cu.user_id,
    cu.company_id,
    r.slug AS role_slug,
    r.name AS role_name
  INTO existing_company_user
  FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  WHERE cu.user_id = current_user_id
  AND cu.company_id = current_company_id;
  
  IF existing_company_user IS NOT NULL THEN
    RAISE NOTICE '✅ Utilisateur: %', existing_company_user.user_id;
    RAISE NOTICE '✅ Entreprise: %', existing_company_user.company_id;
    RAISE NOTICE '✅ Rôle: % (%)', existing_company_user.role_name, existing_company_user.role_slug;
    
    IF existing_company_user.role_slug IN ('owner', 'admin') THEN
      RAISE NOTICE '';
      RAISE NOTICE '✅ ==========================================';
      RAISE NOTICE '✅ SUCCÈS ! Vous pouvez maintenant connecter Google Calendar';
      RAISE NOTICE '✅ ==========================================';
    ELSE
      RAISE WARNING '⚠️  Le rôle n''est pas owner ou admin. Le bouton ne s''affichera pas.';
    END IF;
  ELSE
    RAISE EXCEPTION '❌ Erreur: Impossible de vérifier le rôle final.';
  END IF;
  
END $$;
