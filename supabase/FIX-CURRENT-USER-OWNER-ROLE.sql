-- ============================================================================
-- SCRIPT : ASSIGNER LE RÔLE OWNER À L'UTILISATEUR ACTUEL
-- ============================================================================
-- Ce script vérifie et assigne le rôle owner à l'utilisateur actuellement connecté
-- dans toutes les entreprises où il est membre
-- ============================================================================
-- INSTRUCTIONS :
-- 1. Connectez-vous à votre application
-- 2. Ouvrez Supabase Dashboard → SQL Editor
-- 3. Exécutez ce script
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_owner_role_id UUID;
  v_current_company_id UUID;
  v_companies_count INT := 0;
BEGIN
  -- Récupérer l'utilisateur actuellement connecté
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Aucun utilisateur connecté. Veuillez vous connecter d''abord.';
  END IF;
  
  RAISE NOTICE '👤 Utilisateur connecté : %', v_user_id;
  
  -- Vérifier si l'utilisateur est membre d'au moins une entreprise
  SELECT COUNT(*) INTO v_companies_count
  FROM public.company_users 
  WHERE user_id = v_user_id;
  
  IF v_companies_count = 0 THEN
    RAISE NOTICE '⚠️ L''utilisateur n''est membre d''aucune entreprise.';
    
    -- Récupérer la première entreprise disponible
    SELECT id INTO v_current_company_id
    FROM public.companies
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_current_company_id IS NULL THEN
      RAISE EXCEPTION '❌ Aucune entreprise trouvée dans la base de données.';
    END IF;
    
    RAISE NOTICE '   → Utilisation de l''entreprise : %', v_current_company_id;
    v_companies_count := 1;
  END IF;
  
  -- Parcourir toutes les entreprises où l'utilisateur est membre
  FOR v_current_company_id IN 
    SELECT DISTINCT company_id 
    FROM public.company_users 
    WHERE user_id = v_user_id
    
    UNION
    
    -- Si aucune entreprise trouvée, utiliser la première disponible
    SELECT id
    FROM public.companies
    WHERE NOT EXISTS (SELECT 1 FROM public.company_users WHERE user_id = v_user_id)
    ORDER BY created_at ASC
    LIMIT 1
  LOOP
    -- Récupérer le rôle owner pour cette entreprise
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = v_current_company_id AND slug = 'owner'
    LIMIT 1;
    
    IF v_owner_role_id IS NULL THEN
      RAISE NOTICE '⚠️ Rôle owner non trouvé pour l''entreprise %', v_current_company_id;
      RAISE NOTICE '   → Création du rôle owner...';
      
      -- Créer le rôle owner s'il n'existe pas
      INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
      VALUES (
        v_current_company_id,
        'Propriétaire',
        'owner',
        'Propriétaire de l''entreprise avec tous les droits',
        true,
        false,
        '#f59e0b',
        'crown'
      )
      RETURNING id INTO v_owner_role_id;
      
      RAISE NOTICE '   ✅ Rôle owner créé avec l''ID : %', v_owner_role_id;
    END IF;
    
    -- Assigner le rôle owner à l'utilisateur pour cette entreprise
    INSERT INTO public.company_users (company_id, user_id, role_id, status)
    VALUES (v_current_company_id, v_user_id, v_owner_role_id, 'active')
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET 
      role_id = v_owner_role_id, 
      status = 'active', 
      updated_at = now();
    
    RAISE NOTICE '✅ Rôle owner assigné pour l''entreprise %', v_current_company_id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Traitement terminé pour % entreprise(s)', v_companies_count;
END $$;

-- ============================================================================
-- VÉRIFICATION : Afficher le rôle actuel de l'utilisateur
-- ============================================================================

SELECT 
  c.name as entreprise,
  r.name as role_nom,
  r.slug as role_slug,
  cu.status,
  cu.created_at
FROM public.company_users cu
JOIN public.companies c ON c.id = cu.company_id
JOIN public.roles r ON r.id = cu.role_id
WHERE cu.user_id = auth.uid()
ORDER BY cu.created_at DESC;

-- ============================================================================
-- S'assurer que le rôle owner a toutes les permissions users.*
-- ============================================================================

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'owner'
  AND p.key IN ('users.read', 'users.invite', 'users.update', 'users.delete', 'users.update_role')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
