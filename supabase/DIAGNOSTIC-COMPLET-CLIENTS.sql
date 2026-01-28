-- =====================================================
-- DIAGNOSTIC COMPLET : Problème de suppression clients
-- =====================================================
-- Ce script effectue un diagnostic complet pour identifier
-- pourquoi les clients sont supprimés dans toutes les entreprises
-- =====================================================

-- 1. Vérifier si des clients ont le même ID dans plusieurs entreprises
SELECT 
  '⚠️ Clients avec même ID dans plusieurs entreprises' as diagnostic,
  id,
  COUNT(DISTINCT company_id) as nb_entreprises,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids,
  STRING_AGG(DISTINCT name, ' | ') as noms
FROM public.clients
GROUP BY id
HAVING COUNT(DISTINCT company_id) > 1;

-- 2. Vérifier les clients sans company_id
SELECT 
  '⚠️ Clients sans company_id' as diagnostic,
  COUNT(*) as nombre,
  STRING_AGG(id::TEXT, ', ') as ids
FROM public.clients
WHERE company_id IS NULL;

-- 3. Vérifier si des clients ont un company_id invalide (n'existe pas dans companies)
SELECT 
  '⚠️ Clients avec company_id invalide' as diagnostic,
  c.id,
  c.name,
  c.company_id,
  CASE WHEN comp.id IS NULL THEN '❌ N''existe pas' ELSE '✅ Existe' END as statut
FROM public.clients c
LEFT JOIN public.companies comp ON comp.id = c.company_id
WHERE c.company_id IS NOT NULL
AND comp.id IS NULL
LIMIT 10;

-- 4. Compter les clients par entreprise
SELECT 
  '📊 Clients par entreprise' as diagnostic,
  company_id,
  COUNT(*) as nombre_clients,
  STRING_AGG(id::TEXT, ', ') as client_ids
FROM public.clients
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY nombre_clients DESC;

-- 5. Vérifier toutes les policies DELETE actives
SELECT 
  '🔐 Policies DELETE actives' as diagnostic,
  policyname,
  cmd,
  permissive,
  qual as condition_usando,
  with_check as condition_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
AND cmd = 'DELETE';

-- 6. Vérifier si RLS est activé
SELECT 
  '🔒 RLS Status' as diagnostic,
  rowsecurity as rls_active,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS activé'
    ELSE '❌ RLS désactivé - CRITIQUE!'
  END as statut
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'clients';

-- 7. Tester la fonction current_company_id() pour un utilisateur test
-- (Remplacez 'USER_ID_HERE' par un vrai user_id)
-- SELECT 
--   '🧪 Test current_company_id()' as diagnostic,
--   auth.uid() as current_user_id,
--   public.current_company_id() as current_company_id;

-- 8. Vérifier s'il y a des triggers qui pourraient supprimer des clients
SELECT 
  '⚙️ Triggers sur clients' as diagnostic,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'clients';

-- 9. Vérifier les contraintes de clé étrangère qui pourraient causer des suppressions en cascade
SELECT
  '🔗 Contraintes FK avec ON DELETE CASCADE' as diagnostic,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'clients'
AND rc.delete_rule = 'CASCADE';
