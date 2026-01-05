-- ============================================================================
-- 🔐 AJOUT PERMISSION DELEGATIONS AUX RÔLES EXISTANTS
-- ============================================================================
-- Description: Ajoute la permission delegations.manage aux rôles OWNER
--              et aux rôles personnalisés qui ont déjà users.manage
-- Date: 2026-01-05
-- ============================================================================

-- Ajouter la permission delegations.manage à tous les rôles OWNER existants
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug = 'owner'
AND p.key = 'delegations.manage'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ajouter delegations.read à tous les rôles qui ont users.read
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT rp1.role_id, p.id
FROM public.role_permissions rp1
JOIN public.permissions p1 ON p1.id = rp1.permission_id
CROSS JOIN public.permissions p
WHERE p1.key = 'users.read'
AND p.key = 'delegations.read'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp2
  WHERE rp2.role_id = rp1.role_id
  AND rp2.permission_id = p.id
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
DECLARE
  owner_count INTEGER;
  read_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT rp.role_id) INTO owner_count
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE p.key = 'delegations.manage';

  SELECT COUNT(DISTINCT rp.role_id) INTO read_count
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE p.key = 'delegations.read';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PERMISSIONS DELEGATIONS AJOUTÉES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ % rôles avec delegations.manage', owner_count;
  RAISE NOTICE '✅ % rôles avec delegations.read', read_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les OWNER peuvent maintenant gérer les délégations';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
