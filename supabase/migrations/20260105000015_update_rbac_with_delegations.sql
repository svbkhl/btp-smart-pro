-- ============================================================================
-- 🔄 MISE À JOUR RBAC : Intégration des délégations
-- ============================================================================
-- Description: Remplace les fonctions RBAC pour utiliser les permissions effectives
--              (rôle + délégations actives)
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- REMPLACER get_user_permissions par get_user_effective_permissions
-- ============================================================================
-- Note: On garde get_user_permissions pour compatibilité mais on crée un alias
-- qui utilise les permissions effectives par défaut

-- Fonction wrapper pour compatibilité
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
-- REMPLACER check_user_permission par check_user_effective_permission
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
  RAISE NOTICE '✅ RBAC MIS À JOUR AVEC DÉLÉGATIONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ get_user_permissions() utilise maintenant les permissions effectives';
  RAISE NOTICE '✅ check_user_permission() vérifie maintenant les délégations';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Toutes les vérifications incluent automatiquement les délégations';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
