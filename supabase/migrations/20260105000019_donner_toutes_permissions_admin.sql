-- ============================================================================
-- 🔐 DONNER TOUTES LES PERMISSIONS AU RÔLE ADMIN
-- ============================================================================
-- Description: Ajoute toutes les permissions au rôle ADMIN (sauf permissions critiques)
-- Date: 2026-01-05
-- ============================================================================

DO $$
DECLARE
  role_admin_id UUID;
  perm_count INTEGER;
  added_count INTEGER;
BEGIN
  -- ============================================================================
  -- Récupérer l'ID du rôle ADMIN pour chaque entreprise
  -- ============================================================================
  
  -- Pour chaque entreprise, ajouter toutes les permissions au rôle ADMIN
  FOR role_admin_id IN 
    SELECT r.id
    FROM public.roles r
    WHERE r.slug = 'admin'
  LOOP
    -- Compter les permissions actuelles
    SELECT COUNT(*) INTO perm_count
    FROM public.role_permissions
    WHERE role_id = role_admin_id;
    
    -- Ajouter TOUTES les permissions (sauf permissions critiques OWNER)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_admin_id, p.id
    FROM public.permissions p
    WHERE p.key NOT LIKE 'company.delete%'  -- Pas de suppression entreprise
    AND p.key NOT LIKE 'roles.%'            -- Pas de gestion rôles (sauf read)
    AND p.key != 'roles.read'               -- On garde roles.read mais pas les autres
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = role_admin_id
      AND rp.permission_id = p.id
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    GET DIAGNOSTICS added_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Rôle ADMIN % : % permissions ajoutées (total: %)', 
      role_admin_id, 
      added_count,
      perm_count + added_count;
  END LOOP;
  
  -- ============================================================================
  -- RAPPORT FINAL
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 PERMISSIONS ADMIN MISES À JOUR !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Toutes les permissions ajoutées aux rôles ADMIN';
  RAISE NOTICE '✅ Permissions critiques exclues (company.delete, roles.*)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les ADMIN ont maintenant accès à presque tout';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- VÉRIFICATION : Afficher les permissions ADMIN
-- ============================================================================
SELECT 
  r.name as "Rôle",
  r.slug as "Slug",
  COUNT(DISTINCT rp.permission_id) as "Nombre de permissions",
  STRING_AGG(DISTINCT p.key, ', ' ORDER BY p.key) as "Permissions"
FROM public.roles r
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
LEFT JOIN public.permissions p ON p.id = rp.permission_id
WHERE r.slug = 'admin'
GROUP BY r.id, r.name, r.slug
ORDER BY r.name;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
