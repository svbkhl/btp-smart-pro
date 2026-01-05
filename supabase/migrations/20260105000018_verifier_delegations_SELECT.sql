-- ============================================================================
-- 🔍 VÉRIFICATION : Système de délégation (VERSION SELECT)
-- ============================================================================
-- Description: Vérifie ce qui existe et retourne un rapport visible
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- PARTIE 1: Vérification de la table
-- ============================================================================
SELECT 
  'TABLE DELEGATIONS' as "Vérification",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'delegations'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante - Exécute Script 14'
  END as "Statut";

-- ============================================================================
-- PARTIE 2: Vérification des index
-- ============================================================================
SELECT 
  'INDEX idx_delegations_active_user' as "Vérification",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'delegations'
      AND indexname = 'idx_delegations_active_user'
    ) THEN '✅ Existe'
    ELSE '⚠️  Manquant - Création...'
  END as "Statut";

-- Créer l'index s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'delegations'
    AND indexname = 'idx_delegations_active_user'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'delegations'
  ) THEN
    CREATE INDEX idx_delegations_active_user 
    ON public.delegations(to_user_id, company_id, ends_at, revoked_at)
    WHERE revoked_at IS NULL;
  END IF;
END $$;

-- ============================================================================
-- PARTIE 3: Vérification des fonctions SQL
-- ============================================================================
SELECT 
  'FONCTIONS SQL' as "Vérification",
  COUNT(*) || '/6' as "Statut"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'can_delegate_permission',
  'get_active_delegated_permissions',
  'get_user_effective_permissions',
  'check_user_effective_permission',
  'revoke_delegation',
  'expire_delegations'
);

-- Liste des fonctions manquantes
SELECT 
  'Fonction manquante: ' || missing_func as "⚠️  Problème"
FROM (
  SELECT unnest(ARRAY[
    'can_delegate_permission',
    'get_active_delegated_permissions',
    'get_user_effective_permissions',
    'check_user_effective_permission',
    'revoke_delegation',
    'expire_delegations'
  ]) as missing_func
) funcs
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name = funcs.missing_func
);

-- ============================================================================
-- PARTIE 4: Vérification des permissions
-- ============================================================================
SELECT 
  'PERMISSIONS DELEGATIONS' as "Vérification",
  COUNT(*) || '/2' as "Statut"
FROM public.permissions
WHERE key IN ('delegations.read', 'delegations.manage');

-- Ajouter les permissions si elles n'existent pas
INSERT INTO public.permissions (key, resource, action, description, category) 
SELECT * FROM (VALUES
  ('delegations.read', 'delegations', 'read', 'Voir les délégations temporaires', 'users'),
  ('delegations.manage', 'delegations', 'manage', 'Gérer les délégations temporaires', 'users')
) AS v(key, resource, action, description, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p WHERE p.key = v.key
);

-- ============================================================================
-- PARTIE 5: Vérification RLS
-- ============================================================================
SELECT 
  'RLS ACTIVÉ' as "Vérification",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'delegations'
      AND rowsecurity = true
    ) THEN '✅ Activé'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'delegations'
    ) THEN '⚠️  Non activé - Activation...'
    ELSE 'N/A (table n''existe pas)'
  END as "Statut";

-- Activer RLS si nécessaire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'delegations'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'delegations'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- PARTIE 6: Vérification des policies RLS
-- ============================================================================
SELECT 
  'POLICIES RLS' as "Vérification",
  COUNT(*) || ' policies' as "Statut"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'delegations';

-- ============================================================================
-- PARTIE 7: Vérification des permissions dans les rôles
-- ============================================================================
SELECT 
  'PERMISSIONS DANS RÔLES' as "Vérification",
  COUNT(DISTINCT rp.role_id) || ' rôles avec delegations.manage' as "Statut"
FROM public.role_permissions rp
JOIN public.permissions p ON p.id = rp.permission_id
WHERE p.key = 'delegations.manage';

-- ============================================================================
-- PARTIE 8: RAPPORT FINAL
-- ============================================================================
SELECT 
  '═══════════════════════════════════════════════════════' as "RAPPORT FINAL",
  '' as "Statut"
UNION ALL
SELECT 
  '🎉 SYSTÈME DE DÉLÉGATION' as "RAPPORT FINAL",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'delegations'
    ) 
    AND (
      SELECT COUNT(*) FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN (
        'can_delegate_permission',
        'get_active_delegated_permissions',
        'get_user_effective_permissions',
        'check_user_effective_permission',
        'revoke_delegation',
        'expire_delegations'
      )
    ) = 6
    AND (
      SELECT COUNT(*) FROM public.permissions
      WHERE key IN ('delegations.read', 'delegations.manage')
    ) = 2
    THEN '✅ COMPLET ET OPÉRATIONNEL !'
    ELSE '⚠️  Éléments manquants - Vérifiez ci-dessus'
  END as "Statut"
UNION ALL
SELECT 
  '═══════════════════════════════════════════════════════' as "RAPPORT FINAL",
  '' as "Statut";

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
