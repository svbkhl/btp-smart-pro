-- ============================================================================
-- SCRIPT DIAGNOSTIC: Lister TOUTES les tables et colonnes (VERSION SELECT)
-- Description: Retourner la structure complète de la base de données
-- Date: 2026-01-05
-- ============================================================================

-- PARTIE 1: Toutes les tables avec leur statut company_id
SELECT 
  t.tablename as "Nom de la table",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.tablename 
      AND column_name = 'company_id'
    ) THEN '✅ A company_id'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.tablename 
      AND column_name = 'user_id'
    ) THEN '⚠️ A user_id mais PAS company_id - À SÉCURISER !'
    ELSE 'ℹ️ Ni company_id ni user_id'
  END as "Statut",
  (
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = t.tablename
    AND column_name IN ('id', 'company_id', 'user_id', 'created_by', 'created_at')
  ) as "Colonnes clés"
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- ============================================================================
-- PARTIE 2: Détails des tables BUSINESS (quotes, invoices, payments, clients, projects)
-- ============================================================================

SELECT 
  '📊 TABLES BUSINESS - DÉTAILS COMPLETS' as "Information";

-- Tables avec 'quote' dans le nom
SELECT 
  'TABLES DEVIS' as "Catégorie",
  t.tablename as "Table",
  string_agg(
    c.column_name || ' (' || c.data_type || ')', 
    ', ' 
    ORDER BY c.ordinal_position
  ) as "Toutes les colonnes"
FROM pg_tables t
JOIN information_schema.columns c 
  ON c.table_schema = 'public' 
  AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename LIKE '%quote%'
GROUP BY t.tablename
ORDER BY t.tablename;

-- Tables avec 'invoice' dans le nom
SELECT 
  'TABLES FACTURES' as "Catégorie",
  t.tablename as "Table",
  string_agg(
    c.column_name || ' (' || c.data_type || ')', 
    ', ' 
    ORDER BY c.ordinal_position
  ) as "Toutes les colonnes"
FROM pg_tables t
JOIN information_schema.columns c 
  ON c.table_schema = 'public' 
  AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename LIKE '%invoice%'
GROUP BY t.tablename
ORDER BY t.tablename;

-- Tables avec 'payment' dans le nom
SELECT 
  'TABLES PAIEMENTS' as "Catégorie",
  t.tablename as "Table",
  string_agg(
    c.column_name || ' (' || c.data_type || ')', 
    ', ' 
    ORDER BY c.ordinal_position
  ) as "Toutes les colonnes"
FROM pg_tables t
JOIN information_schema.columns c 
  ON c.table_schema = 'public' 
  AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename LIKE '%payment%'
GROUP BY t.tablename
ORDER BY t.tablename;

-- Tables avec 'client' dans le nom
SELECT 
  'TABLES CLIENTS' as "Catégorie",
  t.tablename as "Table",
  string_agg(
    c.column_name || ' (' || c.data_type || ')', 
    ', ' 
    ORDER BY c.ordinal_position
  ) as "Toutes les colonnes"
FROM pg_tables t
JOIN information_schema.columns c 
  ON c.table_schema = 'public' 
  AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename LIKE '%client%'
GROUP BY t.tablename
ORDER BY t.tablename;

-- Tables avec 'project' dans le nom
SELECT 
  'TABLES PROJETS' as "Catégorie",
  t.tablename as "Table",
  string_agg(
    c.column_name || ' (' || c.data_type || ')', 
    ', ' 
    ORDER BY c.ordinal_position
  ) as "Toutes les colonnes"
FROM pg_tables t
JOIN information_schema.columns c 
  ON c.table_schema = 'public' 
  AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename LIKE '%project%'
GROUP BY t.tablename
ORDER BY t.tablename;

-- ============================================================================
-- FIN DU DIAGNOSTIC
-- ============================================================================
