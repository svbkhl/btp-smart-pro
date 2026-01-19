-- =====================================================
-- SCRIPT DE VÉRIFICATION POST-MIGRATION MULTI-TENANT
-- =====================================================
-- Exécutez ce script APRÈS la migration pour vérifier
-- que tout s'est bien passé
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER LES TABLES AVEC company_id
-- =====================================================

SELECT 
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'company_id'
ORDER BY table_name;

-- =====================================================
-- 2. COMPTER LES LIGNES SANS company_id (DOIT ÊTRE 0)
-- =====================================================

SELECT 'clients' AS table_name, COUNT(*) AS null_count
FROM public.clients WHERE company_id IS NULL
UNION ALL
SELECT 'projects', COUNT(*)
FROM public.projects WHERE company_id IS NULL
UNION ALL
SELECT 'ai_quotes', COUNT(*)
FROM public.ai_quotes WHERE company_id IS NULL
UNION ALL
SELECT 'invoices', COUNT(*)
FROM public.invoices WHERE company_id IS NULL
UNION ALL
SELECT 'payments', COUNT(*)
FROM public.payments WHERE company_id IS NULL
UNION ALL
SELECT 'employees', COUNT(*)
FROM public.employees WHERE company_id IS NULL
UNION ALL
SELECT 'events', COUNT(*)
FROM public.events WHERE company_id IS NULL
UNION ALL
SELECT 'notifications', COUNT(*)
FROM public.notifications WHERE company_id IS NULL
UNION ALL
SELECT 'messages', COUNT(*)
FROM public.messages WHERE company_id IS NULL;
-- email_messages seulement si la table existe
-- (décommenter si la table existe)
-- UNION ALL
-- SELECT 'email_messages', COUNT(*)
-- FROM public.email_messages WHERE company_id IS NULL;

-- Résultat attendu : toutes les lignes doivent avoir null_count = 0

-- =====================================================
-- 3. VÉRIFIER LES FOREIGN KEYS
-- =====================================================

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND kcu.column_name = 'company_id'
ORDER BY tc.table_name;

-- =====================================================
-- 4. VÉRIFIER LES INDEXES SUR company_id
-- =====================================================

SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%company_id%'
ORDER BY tablename, indexname;

-- =====================================================
-- 5. VÉRIFIER LES RLS POLICIES
-- =====================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Company members%'
ORDER BY tablename, cmd;

-- =====================================================
-- 6. COMPTER LES DONNÉES PAR COMPANY
-- =====================================================

-- Voir combien de lignes chaque entreprise possède
SELECT 
  c.name AS company_name,
  c.id AS company_id,
  (SELECT COUNT(*) FROM public.clients WHERE company_id = c.id) AS clients_count,
  (SELECT COUNT(*) FROM public.projects WHERE company_id = c.id) AS projects_count,
  (SELECT COUNT(*) FROM public.invoices WHERE company_id = c.id) AS invoices_count,
  (SELECT COUNT(*) FROM public.payments WHERE company_id = c.id) AS payments_count,
  (SELECT COUNT(*) FROM public.employees WHERE company_id = c.id) AS employees_count
FROM public.companies c
ORDER BY c.created_at;

-- =====================================================
-- 7. VÉRIFIER LES USERS SANS COMPANY
-- =====================================================

-- Les users qui n'ont pas de company assignée
SELECT 
  u.id,
  u.email,
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_users cu
  WHERE cu.user_id = u.id
)
ORDER BY u.created_at;

-- Résultat attendu : devrait être vide ou très peu de lignes
-- (uniquement les nouveaux users non migrés)

-- =====================================================
-- 8. TEST D'ISOLATION : Vérifier qu'un user ne voit que ses données
-- =====================================================

-- Remplacez 'USER_ID_HERE' par l'ID d'un user de test
-- DO $$
-- DECLARE
--   v_test_user_id UUID := 'USER_ID_HERE';
--   v_company_id UUID;
--   v_other_company_id UUID;
-- BEGIN
--   -- Récupérer la company du user de test
--   SELECT company_id INTO v_company_id
--   FROM public.company_users
--   WHERE user_id = v_test_user_id
--   AND status = 'active'
--   LIMIT 1;
--   
--   -- Récupérer une autre company
--   SELECT id INTO v_other_company_id
--   FROM public.companies
--   WHERE id != v_company_id
--   LIMIT 1;
--   
--   -- Vérifier que le user de test ne voit pas les clients de l'autre company
--   -- (à tester manuellement via l'app avec ce user connecté)
--   RAISE NOTICE 'Company du user test: %', v_company_id;
--   RAISE NOTICE 'Autre company: %', v_other_company_id;
-- END $$;

-- =====================================================
-- FIN DU SCRIPT DE VÉRIFICATION
-- =====================================================
