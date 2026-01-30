-- ============================================================================
-- SCRIPT : ASSIGNER LE RÔLE OWNER AUX PREMIERS UTILISATEURS DE CHAQUE ENTREPRISE
-- ============================================================================
-- Ce script identifie le premier utilisateur de chaque entreprise (créé en premier)
-- et lui assigne automatiquement le rôle OWNER avec toutes les permissions
-- ============================================================================
-- INSTRUCTIONS :
-- 1. Exécutez ce script dans Supabase Dashboard → SQL Editor
-- 2. Le script assignera automatiquement le rôle owner aux premiers utilisateurs
-- ============================================================================

DO $$
DECLARE
  v_company_id UUID;
  v_first_user_id UUID;
  v_owner_role_id UUID;
  v_user_email TEXT;
  v_companies_processed INT := 0;
  v_users_updated INT := 0;
BEGIN
  RAISE NOTICE '🚀 Début de l''assignation des rôles OWNER...';
  RAISE NOTICE '';
  
  -- Parcourir toutes les entreprises
  FOR v_company_id IN 
    SELECT DISTINCT id FROM public.companies ORDER BY created_at ASC
  LOOP
    v_companies_processed := v_companies_processed + 1;
    
    -- Trouver le premier utilisateur de cette entreprise (créé en premier)
    SELECT cu.user_id, u.email
    INTO v_first_user_id, v_user_email
    FROM public.company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.company_id = v_company_id
    ORDER BY cu.created_at ASC
    LIMIT 1;
    
    IF v_first_user_id IS NULL THEN
      RAISE NOTICE '⚠️ Aucun utilisateur trouvé pour l''entreprise %', v_company_id;
      CONTINUE;
    END IF;
    
    -- Récupérer ou créer le rôle OWNER pour cette entreprise
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = v_company_id AND slug = 'owner'
    LIMIT 1;
    
    IF v_owner_role_id IS NULL THEN
      RAISE NOTICE '   ⚠️ Rôle OWNER non trouvé pour l''entreprise %. Création...', v_company_id;
      
      INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
      VALUES (
        v_company_id,
        'Propriétaire',
        'owner',
        'Propriétaire de l''entreprise avec TOUS les droits (rôle le plus élevé)',
        true,
        false,
        '#f59e0b',
        'crown'
      )
      RETURNING id INTO v_owner_role_id;
      
      RAISE NOTICE '   ✅ Rôle OWNER créé (ID: %)', v_owner_role_id;
    END IF;
    
    -- Assigner le rôle OWNER au premier utilisateur
    INSERT INTO public.company_users (company_id, user_id, role_id, status)
    VALUES (v_company_id, v_first_user_id, v_owner_role_id, 'active')
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET 
      role_id = v_owner_role_id,  -- Toujours OWNER, jamais autre chose
      status = 'active', 
      updated_at = now();
    
    v_users_updated := v_users_updated + 1;
    RAISE NOTICE '   ✅ Rôle OWNER assigné à % (premier utilisateur de l''entreprise %)', v_user_email, v_company_id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Traitement terminé :';
  RAISE NOTICE '   - Entreprises traitées : %', v_companies_processed;
  RAISE NOTICE '   - Utilisateurs mis à jour : %', v_users_updated;
END $$;

-- ============================================================================
-- ASSIGNER TOUTES LES PERMISSIONS users.* AUX RÔLES OWNER
-- ============================================================================

DO $$
DECLARE
  v_permissions_count INT;
BEGIN
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
  
  GET DIAGNOSTICS v_permissions_count = ROW_COUNT;
  RAISE NOTICE '✅ Permissions users.* assignées à tous les rôles OWNER (% permissions)', v_permissions_count;
END $$;

-- ============================================================================
-- VÉRIFICATION : Afficher tous les owners et leurs entreprises
-- ============================================================================

SELECT 
  u.email,
  c.name as entreprise,
  r.name as role_nom,
  r.slug as role_slug,
  CASE 
    WHEN r.slug = 'owner' THEN '✅ PROPRIÉTAIRE (tous les droits)'
    ELSE '❌ AUTRE RÔLE'
  END as statut_role,
  cu.status,
  cu.created_at as date_ajout_entreprise
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
JOIN public.companies c ON c.id = cu.company_id
JOIN public.roles r ON r.id = cu.role_id
WHERE r.slug = 'owner'
ORDER BY c.created_at ASC, cu.created_at ASC;

-- ============================================================================
-- VÉRIFICATION : Compter les permissions par rôle OWNER
-- ============================================================================

SELECT 
  c.name as entreprise,
  r.slug as role_slug,
  COUNT(rp.permission_id) as nombre_permissions_users
FROM public.roles r
JOIN public.companies c ON c.id = r.company_id
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
LEFT JOIN public.permissions p ON p.id = rp.permission_id AND p.key LIKE 'users.%'
WHERE r.slug = 'owner'
GROUP BY c.name, r.slug
ORDER BY c.name;
