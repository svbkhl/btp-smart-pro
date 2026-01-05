-- ============================================================================
-- 🔧 FIX : Retirer toutes les références à company_users.status
-- ============================================================================
-- Description: La colonne status n'existe pas dans company_users
--              Retire toutes les références pour éviter les erreurs
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FIX 1: Corriger get_user_permissions (version originale)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid UUID, company_uuid UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  permissions_array TEXT[];
BEGIN
  -- Récupérer toutes les permissions de l'utilisateur (SANS vérifier status)
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

COMMENT ON FUNCTION public.get_user_permissions IS 'Retourne toutes les permissions d''un utilisateur dans une entreprise';

-- ============================================================================
-- FIX 2: Corriger check_user_permission (version originale)
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
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur a la permission (SANS vérifier status)
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

COMMENT ON FUNCTION public.check_user_permission IS 'Vérifie si un utilisateur a une permission spécifique';

-- ============================================================================
-- FIX 3: Corriger is_owner
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_owner(user_uuid UUID, company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_owner_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = user_uuid
    AND cu.company_id = company_uuid
    AND r.slug = 'owner'
  ) INTO is_owner_result;
  
  RETURN COALESCE(is_owner_result, false);
END;
$$;

COMMENT ON FUNCTION public.is_owner IS 'Vérifie si un utilisateur est OWNER d''une entreprise';

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ RÉFÉRENCES À status RETIRÉES !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ get_user_permissions() corrigée';
  RAISE NOTICE '✅ check_user_permission() corrigée';
  RAISE NOTICE '✅ is_owner() corrigée';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Plus d''erreur: column company_users.status does not exist';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
