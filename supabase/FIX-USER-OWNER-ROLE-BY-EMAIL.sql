-- ============================================================================
-- SCRIPT : ASSIGNER LE RÔLE OWNER À UN UTILISATEUR PAR EMAIL
-- ============================================================================
-- Ce script assigne le rôle OWNER (propriétaire) à un utilisateur spécifique
-- IMPORTANT : OWNER ≠ ADMIN
--   - OWNER : Propriétaire de l'entreprise (rôle le plus élevé, tous les droits)
--   - ADMIN : Administrateur (rôle élevé mais limité, pas propriétaire)
-- ============================================================================
-- INSTRUCTIONS :
-- 1. Remplacez 'VOTRE_EMAIL@example.com' par votre email dans le script
-- 2. Exécutez ce script dans Supabase Dashboard → SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_user_email TEXT := 'sabri.khalfallah6@gmail.com'; -- ⚠️ MODIFIEZ ICI avec votre email
  v_user_id UUID;
  v_company_id UUID;
  v_owner_role_id UUID;
  v_admin_role_id UUID;
  v_current_company_id UUID;
  v_companies_count INT := 0;
BEGIN
  -- Récupérer l'utilisateur par email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(v_user_email)
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Utilisateur avec l''email % non trouvé dans auth.users', v_user_email;
  END IF;
  
  RAISE NOTICE '👤 Utilisateur trouvé : % (ID: %)', v_user_email, v_user_id;
  
  -- Parcourir toutes les entreprises où l'utilisateur est membre
  FOR v_current_company_id IN 
    SELECT DISTINCT company_id 
    FROM public.company_users 
    WHERE user_id = v_user_id
  LOOP
    v_companies_count := v_companies_count + 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 Traitement de l''entreprise : %', v_current_company_id;
    
    -- ========================================================================
    -- 1. Vérifier/Créer le rôle OWNER (propriétaire)
    -- ========================================================================
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = v_current_company_id AND slug = 'owner'
    LIMIT 1;
    
    IF v_owner_role_id IS NULL THEN
      RAISE NOTICE '   ⚠️ Rôle OWNER non trouvé. Création...';
      
      INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
      VALUES (
        v_current_company_id,
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
    ELSE
      RAISE NOTICE '   ✅ Rôle OWNER existe déjà (ID: %)', v_owner_role_id;
    END IF;
    
    -- ========================================================================
    -- 2. Vérifier/Créer le rôle ADMIN (administrateur) - pour référence
    -- ========================================================================
    SELECT id INTO v_admin_role_id
    FROM public.roles
    WHERE company_id = v_current_company_id AND slug = 'admin'
    LIMIT 1;
    
    IF v_admin_role_id IS NULL THEN
      RAISE NOTICE '   ℹ️ Rôle ADMIN non trouvé. Création...';
      
      INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
      VALUES (
        v_current_company_id,
        'Administrateur',
        'admin',
        'Administrateur avec droits élevés mais limités (pas propriétaire)',
        true,
        false,
        '#8b5cf6',
        'shield'
      )
      RETURNING id INTO v_admin_role_id;
      
      RAISE NOTICE '   ✅ Rôle ADMIN créé (ID: %)', v_admin_role_id;
    END IF;
    
    -- ========================================================================
    -- 3. Assigner le rôle OWNER (pas ADMIN) à l'utilisateur
    -- ========================================================================
    INSERT INTO public.company_users (company_id, user_id, role_id, status)
    VALUES (v_current_company_id, v_user_id, v_owner_role_id, 'active')
    ON CONFLICT (company_id, user_id)
    DO UPDATE SET 
      role_id = v_owner_role_id,  -- ⚠️ Toujours OWNER, jamais ADMIN
      status = 'active', 
      updated_at = now();
    
    RAISE NOTICE '   ✅ Rôle OWNER assigné à % pour l''entreprise %', v_user_email, v_current_company_id;
    
    -- ========================================================================
    -- 4. S'assurer que le rôle OWNER a TOUTES les permissions users.*
    -- ========================================================================
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_owner_role_id, p.id
    FROM public.permissions p
    WHERE p.key IN ('users.read', 'users.invite', 'users.update', 'users.delete', 'users.update_role')
      AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_owner_role_id AND rp.permission_id = p.id
      )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE '   ✅ Permissions users.* assignées au rôle OWNER';
  END LOOP;
  
  IF v_companies_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ L''utilisateur n''est membre d''aucune entreprise.';
    RAISE NOTICE '   → Vérifiez que vous avez bien une entreprise associée.';
    RAISE NOTICE '   → Vous pouvez créer une entreprise depuis l''application.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Traitement terminé pour % entreprise(s)', v_companies_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 RÉSUMÉ :';
    RAISE NOTICE '   - Rôle assigné : OWNER (propriétaire) ✅';
    RAISE NOTICE '   - Rôle NON assigné : ADMIN (administrateur) ❌';
    RAISE NOTICE '   - Permissions : Toutes les permissions users.* ✅';
  END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION : Afficher le rôle actuel de l'utilisateur
-- ============================================================================

SELECT 
  u.email,
  c.name as entreprise,
  r.name as role_nom,
  r.slug as role_slug,
  CASE 
    WHEN r.slug = 'owner' THEN '✅ PROPRIÉTAIRE (tous les droits)'
    WHEN r.slug = 'admin' THEN '⚠️ ADMINISTRATEUR (droits limités)'
    ELSE '❓ AUTRE RÔLE'
  END as statut_role,
  cu.status,
  cu.created_at
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
JOIN public.companies c ON c.id = cu.company_id
JOIN public.roles r ON r.id = cu.role_id
WHERE LOWER(u.email) = LOWER('sabri.khalfallah6@gmail.com') -- ⚠️ MODIFIEZ ICI avec votre email
ORDER BY cu.created_at DESC;

-- ============================================================================
-- VÉRIFICATION : Compter les permissions du rôle OWNER
-- ============================================================================

SELECT 
  c.name as entreprise,
  r.slug as role_slug,
  COUNT(rp.permission_id) as nombre_permissions
FROM public.roles r
JOIN public.companies c ON c.id = r.company_id
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
WHERE r.slug = 'owner'
GROUP BY c.name, r.slug
ORDER BY c.name;
