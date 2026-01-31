-- ============================================================================
-- CORRECTION COMPLÈTE : RÔLES, PERMISSIONS ET COMPANY_USERS
-- ============================================================================
-- Ce script corrige TOUS les problèmes de rôles et permissions :
-- 1. Crée les rôles système (owner, admin, rh, employee) pour toutes les entreprises
-- 2. Assigne le rôle owner au premier utilisateur de chaque entreprise
-- 3. Met à jour tous les company_users avec le bon role_id
-- 4. Assigne toutes les permissions aux rôles
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Créer les rôles système pour toutes les entreprises
-- ============================================================================

DO $$
DECLARE
  v_company RECORD;
  v_roles_created INT := 0;
BEGIN
  RAISE NOTICE '🚀 Création des rôles système pour toutes les entreprises...';
  RAISE NOTICE '';
  
  -- Parcourir toutes les entreprises
  FOR v_company IN SELECT id, name FROM public.companies ORDER BY created_at ASC
  LOOP
    RAISE NOTICE '📦 Entreprise: % (ID: %)', v_company.name, v_company.id;
    
    -- Appeler la fonction qui crée les rôles système
    BEGIN
      PERFORM public.create_system_roles_for_company(v_company.id);
      v_roles_created := v_roles_created + 1;
      RAISE NOTICE '   ✅ Rôles système créés';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Erreur lors de la création des rôles: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Rôles créés pour % entreprise(s)', v_roles_created;
END $$;

-- ============================================================================
-- ÉTAPE 2 : Assigner le rôle OWNER au premier utilisateur de chaque entreprise
-- ============================================================================

DO $$
DECLARE
  v_company RECORD;
  v_first_user_id UUID;
  v_user_email TEXT;
  v_owner_role_id UUID;
  v_updated INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Attribution du rôle OWNER aux premiers utilisateurs...';
  RAISE NOTICE '';
  
  -- Parcourir toutes les entreprises
  FOR v_company IN SELECT id, name FROM public.companies ORDER BY created_at ASC
  LOOP
    -- Trouver le premier utilisateur de cette entreprise
    SELECT cu.user_id, u.email
    INTO v_first_user_id, v_user_email
    FROM public.company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.company_id = v_company.id
    ORDER BY cu.created_at ASC
    LIMIT 1;
    
    IF v_first_user_id IS NULL THEN
      RAISE NOTICE '   ⚠️ Aucun utilisateur pour l''entreprise %', v_company.name;
      CONTINUE;
    END IF;
    
    -- Récupérer le rôle owner pour cette entreprise
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = v_company.id AND slug = 'owner'
    LIMIT 1;
    
    IF v_owner_role_id IS NULL THEN
      RAISE NOTICE '   ⚠️ Rôle owner non trouvé pour %', v_company.name;
      CONTINUE;
    END IF;
    
    -- Mettre à jour le premier utilisateur avec le rôle owner
    UPDATE public.company_users
    SET role_id = v_owner_role_id, role = 'owner', status = 'active'
    WHERE company_id = v_company.id AND user_id = v_first_user_id;
    
    v_updated := v_updated + 1;
    RAISE NOTICE '   ✅ % → OWNER de %', v_user_email, v_company.name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ % premier(s) utilisateur(s) mis en OWNER', v_updated;
END $$;

-- ============================================================================
-- ÉTAPE 3 : Fixer tous les company_users qui ont role_id NULL
-- ============================================================================

DO $$
DECLARE
  v_cu RECORD;
  v_role_id UUID;
  v_updated INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Correction des company_users avec role_id NULL...';
  RAISE NOTICE '';
  
  -- Trouver tous les company_users sans role_id
  FOR v_cu IN 
    SELECT cu.id, cu.company_id, cu.user_id, cu.role, u.email
    FROM public.company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.role_id IS NULL
  LOOP
    -- Trouver le role_id correspondant au role TEXT
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE company_id = v_cu.company_id 
      AND slug = CASE 
        WHEN v_cu.role = 'owner' THEN 'owner'
        WHEN v_cu.role = 'admin' THEN 'admin'
        WHEN v_cu.role = 'rh' THEN 'rh'
        ELSE 'employee'
      END
    LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
      UPDATE public.company_users
      SET role_id = v_role_id
      WHERE id = v_cu.id;
      
      v_updated := v_updated + 1;
      RAISE NOTICE '   ✅ % → role_id assigné', v_cu.email;
    ELSE
      RAISE NOTICE '   ⚠️ Aucun rôle trouvé pour % (role=%)', v_cu.email, v_cu.role;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ % company_users corrigé(s)', v_updated;
END $$;

-- ============================================================================
-- ÉTAPE 4 : Assigner toutes les permissions users.* aux rôles OWNER
-- ============================================================================

DO $$
DECLARE
  v_permissions_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔑 Attribution des permissions users.* aux rôles OWNER...';
  
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
  RAISE NOTICE '✅ % permission(s) users.* assignée(s) aux rôles OWNER', v_permissions_count;
END $$;

-- ============================================================================
-- VÉRIFICATION FINALE : Afficher tous les utilisateurs avec leurs rôles
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '📊 VÉRIFICATION FINALE :';
RAISE NOTICE '';

SELECT 
  u.email as "Email",
  c.name as "Entreprise",
  r.name as "Rôle",
  r.slug as "Slug",
  cu.role as "role (TEXT)",
  CASE 
    WHEN r.slug = 'owner' THEN '✅ PROPRIÉTAIRE'
    WHEN r.slug = 'admin' THEN '⚠️ ADMINISTRATEUR'
    WHEN r.slug = 'rh' THEN 'ℹ️ RH'
    WHEN r.slug = 'employee' THEN 'ℹ️ EMPLOYÉ'
    ELSE '❓ AUTRE'
  END as "Statut",
  cu.status as "Status",
  CASE 
    WHEN cu.role_id IS NULL THEN '❌ role_id NULL'
    ELSE '✅ role_id OK'
  END as "role_id Check"
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
JOIN public.companies c ON c.id = cu.company_id
LEFT JOIN public.roles r ON r.id = cu.role_id
ORDER BY c.created_at ASC, cu.created_at ASC;
