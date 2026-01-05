-- ============================================================================
-- SCRIPT DIAGNOSTIC: Lister TOUTES les tables et colonnes
-- Description: Afficher la structure complète de la base de données
-- Date: 2026-01-05
-- ============================================================================

DO $$
DECLARE
  table_record RECORD;
  column_record RECORD;
  has_company_id BOOLEAN;
  has_user_id BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSTIC COMPLET DE LA BASE DE DONNÉES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Lister TOUTES les tables publiques
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    -- Vérifier si company_id existe
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_record.tablename 
      AND column_name = 'company_id'
    ) INTO has_company_id;
    
    -- Vérifier si user_id existe
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_record.tablename 
      AND column_name = 'user_id'
    ) INTO has_user_id;
    
    -- Afficher la table avec son statut
    IF has_company_id THEN
      RAISE NOTICE '✅ % (a company_id)', table_record.tablename;
    ELSIF has_user_id THEN
      RAISE NOTICE '⚠️  % (a user_id mais PAS company_id) ← DOIT ÊTRE SÉCURISÉE', table_record.tablename;
    ELSE
      RAISE NOTICE 'ℹ️  % (ni company_id ni user_id)', table_record.tablename;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📋 COLONNES DES TABLES CRITIQUES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Afficher les colonnes des tables business
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND (
      tablename LIKE '%quote%' OR 
      tablename LIKE '%invoice%' OR 
      tablename LIKE '%payment%' OR 
      tablename LIKE '%client%' OR
      tablename LIKE '%project%'
    )
    ORDER BY tablename
  LOOP
    RAISE NOTICE '📄 Table: %', table_record.tablename;
    
    FOR column_record IN
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = table_record.tablename
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  - % (%)', column_record.column_name, column_record.data_type;
    END LOOP;
    
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU DIAGNOSTIC
-- ============================================================================
