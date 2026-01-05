-- ============================================================================
-- 🔍 DIAGNOSTIC : Structure de la table events
-- ============================================================================
-- Description: Vérifie la structure de la table events et identifie les problèmes
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- VÉRIFICATION 1: Structure de la table events
-- ============================================================================
SELECT 
  'Structure de la table events' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
ORDER BY ordinal_position;

-- ============================================================================
-- VÉRIFICATION 2: Colonnes UUID et leurs contraintes
-- ============================================================================
SELECT 
  'Colonnes UUID dans events' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
AND data_type = 'uuid'
ORDER BY column_name;

-- ============================================================================
-- VÉRIFICATION 3: Contraintes et clés étrangères
-- ============================================================================
SELECT 
  'Contraintes events' as check_type,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
AND tc.table_name = 'events'
ORDER BY tc.constraint_type, kcu.column_name;

-- ============================================================================
-- VÉRIFICATION 4: Indexes sur events
-- ============================================================================
SELECT 
  'Indexes sur events' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'events'
ORDER BY indexname;

-- ============================================================================
-- VÉRIFICATION 5: RLS activé ?
-- ============================================================================
SELECT 
  'RLS sur events' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'events';

-- ============================================================================
-- VÉRIFICATION 6: Policies RLS
-- ============================================================================
SELECT 
  'Policies RLS events' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events'
ORDER BY policyname;

-- ============================================================================
-- VÉRIFICATION 7: Données suspectes (company_id = "events")
-- ============================================================================
SELECT 
  'Données suspectes' as check_type,
  COUNT(*) as count_suspects,
  'events avec company_id invalide' as description
FROM public.events
WHERE company_id::text = 'events'
OR user_id::text = 'events'
OR (company_id::text NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');

-- ============================================================================
-- VÉRIFICATION 8: Exemple de données (5 premiers événements)
-- ============================================================================
SELECT 
  'Exemple données' as check_type,
  id,
  user_id,
  company_id,
  title,
  start_date,
  created_at
FROM public.events
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ DIAGNOSTIC TABLE EVENTS TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Structure de la table vérifiée';
  RAISE NOTICE '✅ Colonnes UUID vérifiées';
  RAISE NOTICE '✅ Contraintes vérifiées';
  RAISE NOTICE '✅ Indexes vérifiés';
  RAISE NOTICE '✅ RLS vérifié';
  RAISE NOTICE '✅ Policies vérifiées';
  RAISE NOTICE '✅ Données suspectes vérifiées';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Vérifie les résultats ci-dessus pour identifier les problèmes';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
