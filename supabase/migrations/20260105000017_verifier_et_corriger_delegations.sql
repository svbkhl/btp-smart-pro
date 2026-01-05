-- ============================================================================
-- 🔍 VÉRIFICATION ET CORRECTION : Système de délégation
-- ============================================================================
-- Description: Vérifie ce qui existe et corrige ce qui manque
-- Date: 2026-01-05
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  index_exists BOOLEAN;
  function_count INTEGER;
  permission_count INTEGER;
BEGIN
  -- ============================================================================
  -- VÉRIFICATION 1: Table delegations
  -- ============================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'delegations'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE '❌ Table delegations n''existe pas - Exécute le Script 14';
  ELSE
    RAISE NOTICE '✅ Table delegations existe';
  END IF;

  -- ============================================================================
  -- VÉRIFICATION 2: Index corrigé (sans now())
  -- ============================================================================
  IF table_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'delegations'
      AND indexname = 'idx_delegations_active_user'
    ) INTO index_exists;

    IF NOT index_exists THEN
      RAISE NOTICE '⚠️  Index idx_delegations_active_user manquant - Création...';
      
      -- Créer l'index corrigé (sans now())
      CREATE INDEX IF NOT EXISTS idx_delegations_active_user 
      ON public.delegations(to_user_id, company_id, ends_at, revoked_at)
      WHERE revoked_at IS NULL;
      
      RAISE NOTICE '✅ Index idx_delegations_active_user créé';
    ELSE
      RAISE NOTICE '✅ Index idx_delegations_active_user existe';
    END IF;
  END IF;

  -- ============================================================================
  -- VÉRIFICATION 3: Fonctions SQL
  -- ============================================================================
  SELECT COUNT(*) INTO function_count
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

  IF function_count < 6 THEN
    RAISE NOTICE '⚠️  % fonctions manquantes - Exécute le Script 14', (6 - function_count);
  ELSE
    RAISE NOTICE '✅ Toutes les fonctions SQL existent (6/6)';
  END IF;

  -- ============================================================================
  -- VÉRIFICATION 4: Permissions
  -- ============================================================================
  SELECT COUNT(*) INTO permission_count
  FROM public.permissions
  WHERE key IN ('delegations.read', 'delegations.manage');

  IF permission_count < 2 THEN
    RAISE NOTICE '⚠️  Permissions delegations manquantes - Exécute le Script 2';
    
    -- Ajouter les permissions si elles n'existent pas
    INSERT INTO public.permissions (key, resource, action, description, category) VALUES
    ('delegations.read', 'delegations', 'read', 'Voir les délégations temporaires', 'users'),
    ('delegations.manage', 'delegations', 'manage', 'Gérer les délégations temporaires', 'users')
    ON CONFLICT (key) DO NOTHING;
    
    RAISE NOTICE '✅ Permissions delegations ajoutées';
  ELSE
    RAISE NOTICE '✅ Permissions delegations existent (2/2)';
  END IF;

  -- ============================================================================
  -- VÉRIFICATION 5: RLS activé
  -- ============================================================================
  IF table_exists THEN
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'delegations'
      AND rowsecurity = true
    ) THEN
      RAISE NOTICE '✅ RLS activé sur delegations';
    ELSE
      RAISE NOTICE '⚠️  RLS non activé - Activation...';
      ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE '✅ RLS activé';
    END IF;
  END IF;

  -- ============================================================================
  -- RAPPORT FINAL
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RAPPORT DE VÉRIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Table delegations: %', CASE WHEN table_exists THEN '✅ Existe' ELSE '❌ Manquante' END;
  RAISE NOTICE 'Index corrigé: %', CASE WHEN index_exists OR NOT table_exists THEN '✅ OK' ELSE '⚠️  Créé' END;
  RAISE NOTICE 'Fonctions SQL: %/6', function_count;
  RAISE NOTICE 'Permissions: %/2', permission_count;
  RAISE NOTICE '';
  
  IF table_exists AND function_count = 6 AND permission_count = 2 THEN
    RAISE NOTICE '🎉 SYSTÈME DE DÉLÉGATION COMPLET ET OPÉRATIONNEL !';
  ELSE
    RAISE NOTICE '⚠️  Certains éléments manquent - Vérifiez les messages ci-dessus';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';

END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
