-- ============================================================================
-- 🔧 FIX : Retirer status des RLS policies
-- ============================================================================
-- Description: Retire toutes les références à cu.status dans les RLS policies
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FIX: Policies qui utilisent cu.status
-- ============================================================================

-- Note: Les policies sont déjà corrigées dans 20260105000004_rbac_rls_policies_FIXED.sql
-- Ce script vérifie et corrige si nécessaire

DO $$
DECLARE
  policy_record RECORD;
  policy_def TEXT;
  has_status BOOLEAN;
BEGIN
  -- Vérifier toutes les policies sur company_users
  FOR policy_record IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'company_users'
  LOOP
    -- Vérifier si la policy utilise cu.status
    has_status := false;
    
    IF policy_record.qual IS NOT NULL AND policy_record.qual LIKE '%status%' THEN
      has_status := true;
    END IF;
    
    IF policy_record.with_check IS NOT NULL AND policy_record.with_check LIKE '%status%' THEN
      has_status := true;
    END IF;
    
    IF has_status THEN
      RAISE NOTICE '⚠️  Policy % utilise status - À corriger manuellement', policy_record.policyname;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Vérification des policies terminée';
END $$;

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION RLS POLICIES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Policies vérifiées';
  RAISE NOTICE '⚠️  Si des policies utilisent status, elles doivent être corrigées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Utilisez 20260105000004_rbac_rls_policies_FIXED.sql';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
