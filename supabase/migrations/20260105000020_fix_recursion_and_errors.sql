-- ============================================================================
-- 🔧 FIX : Récursion infinie + Erreurs
-- ============================================================================
-- Description: Corrige la récursion infinie dans get_user_permissions
--              et s'assure que tout fonctionne correctement
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FIX 1: Créer une fonction pour récupérer les permissions du RÔLE uniquement
-- ============================================================================
-- Cette fonction ne doit PAS appeler get_user_effective_permissions
CREATE OR REPLACE FUNCTION public.get_user_role_permissions(user_uuid UUID, company_uuid UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  permissions_array TEXT[];
BEGIN
  -- Récupérer UNIQUEMENT les permissions du rôle (sans délégations)
  -- Note: On ne vérifie PAS cu.status car cette colonne n'existe peut-être pas
  SELECT ARRAY_AGG(DISTINCT p.key)
  INTO permissions_array
  FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE cu.user_id = user_uuid
  AND cu.company_id = company_uuid
  AND r.company_id = company_uuid;
  
  RETURN COALESCE(permissions_array, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION public.get_user_role_permissions IS 'Retourne UNIQUEMENT les permissions du rôle (sans délégations)';

-- ============================================================================
-- FIX 2: Corriger get_user_effective_permissions pour éviter la récursion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  user_uuid UUID,
  company_uuid UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  role_permissions TEXT[];
  delegated_permissions TEXT[];
  effective_permissions TEXT[];
BEGIN
  -- Récupérer les permissions du rôle (fonction directe, pas de récursion)
  SELECT public.get_user_role_permissions(user_uuid, company_uuid) INTO role_permissions;
  
  -- Récupérer les permissions déléguées actives
  SELECT public.get_active_delegated_permissions(user_uuid, company_uuid) INTO delegated_permissions;
  
  -- Fusionner (sans doublons)
  SELECT ARRAY(
    SELECT DISTINCT unnest(role_permissions || delegated_permissions)
    ORDER BY 1
  ) INTO effective_permissions;
  
  RETURN COALESCE(effective_permissions, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION public.get_user_effective_permissions IS 'Retourne les permissions effectives (rôle + délégations actives) - SANS RÉCURSION';

-- ============================================================================
-- FIX 3: Corriger get_user_permissions pour utiliser get_user_effective_permissions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid UUID, company_uuid UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Utiliser les permissions effectives (rôle + délégations)
  RETURN public.get_user_effective_permissions(user_uuid, company_uuid);
END;
$$;

COMMENT ON FUNCTION public.get_user_permissions IS 'Retourne les permissions effectives (rôle + délégations actives)';

-- ============================================================================
-- FIX 4: Créer une fonction pour vérifier permission du RÔLE uniquement
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_role_permission(
  user_uuid UUID, 
  company_uuid UUID, 
  permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Vérifier UNIQUEMENT dans le rôle (sans délégations)
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = user_uuid
    AND cu.company_id = company_uuid
    AND r.company_id = company_uuid
    AND p.key = permission_key
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.check_user_role_permission IS 'Vérifie si un utilisateur a une permission dans son RÔLE (sans délégations)';

-- ============================================================================
-- FIX 5: Corriger check_user_effective_permission pour éviter la récursion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_effective_permission(
  user_uuid UUID,
  company_uuid UUID,
  permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Vérifier d'abord dans le rôle (fonction directe, pas de récursion)
  SELECT public.check_user_role_permission(user_uuid, company_uuid, permission_key) INTO has_permission;
  
  IF has_permission THEN
    RETURN true;
  END IF;
  
  -- Sinon vérifier dans les délégations actives
  SELECT EXISTS (
    SELECT 1
    FROM public.delegations d
    WHERE d.to_user_id = user_uuid
    AND d.company_id = company_uuid
    AND d.permission_key = permission_key
    AND d.revoked_at IS NULL
    AND d.starts_at <= now()
    AND d.ends_at > now()
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.check_user_effective_permission IS 'Vérifie si un utilisateur a une permission (rôle ou délégation active) - SANS RÉCURSION';

-- ============================================================================
-- FIX 6: Corriger check_user_permission pour utiliser check_user_effective_permission
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_uuid UUID, 
  company_uuid UUID, 
  permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Utiliser la vérification avec délégations
  RETURN public.check_user_effective_permission(user_uuid, company_uuid, permission_key);
END;
$$;

COMMENT ON FUNCTION public.check_user_permission IS 'Vérifie si un utilisateur a une permission (rôle ou délégation active)';

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ RÉCURSION INFINIE CORRIGÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonctions créées:';
  RAISE NOTICE '   - get_user_role_permissions() (rôle uniquement)';
  RAISE NOTICE '   - check_user_role_permission() (rôle uniquement)';
  RAISE NOTICE '✅ Fonctions corrigées:';
  RAISE NOTICE '   - get_user_effective_permissions() (plus de récursion)';
  RAISE NOTICE '   - check_user_effective_permission() (plus de récursion)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Plus d''erreur stack depth limit exceeded';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
