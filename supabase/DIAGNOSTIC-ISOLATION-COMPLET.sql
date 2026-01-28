-- ============================================
-- DIAGNOSTIC COMPLET D'ISOLATION
-- ============================================
-- Ce script diagnostique tous les aspects de l'isolation multi-tenant
-- ============================================

-- 1. VÉRIFIER L'ÉTAT RLS
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE 
    WHEN relforcerowsecurity OR relrowsecurity THEN '✅ Activé'
    ELSE '❌ Désactivé'
  END as rls_status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
WHERE schemaname = 'public' 
  AND tablename = 'clients';

-- 2. VÉRIFIER LES POLICIES RLS
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual LIKE '%company_id%' OR qual LIKE '%current_company_id%' THEN '✅ Filtre company_id'
    WHEN with_check LIKE '%company_id%' OR with_check LIKE '%current_company_id%' THEN '✅ Filtre company_id'
    ELSE '❌ Pas de filtre company_id'
  END as has_company_filter,
  LEFT(qual, 100) as policy_condition,
  LEFT(with_check, 100) as policy_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
ORDER BY cmd;

-- 3. VÉRIFIER LE TRIGGER
SELECT 
  'Trigger' as check_type,
  tgname as trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as trigger_status,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.clients'::regclass
  AND tgname = 'force_company_id';

-- 4. VÉRIFIER LES DONNÉES
SELECT 
  'Data Check' as check_type,
  COUNT(*) as total_clients,
  COUNT(DISTINCT company_id) as distinct_companies,
  COUNT(*) FILTER (WHERE company_id IS NULL) as clients_without_company_id,
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) as clients_with_company_id
FROM public.clients;

-- 5. VÉRIFIER LES DOUBLONS (même ID dans plusieurs entreprises)
SELECT 
  'Duplicate Check' as check_type,
  id,
  COUNT(DISTINCT company_id) as company_count,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids
FROM public.clients
GROUP BY id
HAVING COUNT(DISTINCT company_id) > 1;

-- 6. DISTRIBUTION PAR ENTREPRISE
SELECT 
  'Distribution' as check_type,
  company_id,
  COUNT(*) as client_count,
  STRING_AGG(name, ', ' ORDER BY name) FILTER (WHERE name IS NOT NULL) as sample_names
FROM public.clients
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY client_count DESC;

-- 7. VÉRIFIER LA FONCTION current_company_id()
SELECT 
  'Function' as check_type,
  routine_name,
  routine_type,
  '✅ Existe' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'current_company_id';

-- 8. TEST DE LA FONCTION (si un utilisateur est connecté)
-- Note: Ceci nécessite un contexte d'authentification
DO $$
DECLARE
  v_test_result UUID;
BEGIN
  BEGIN
    SELECT public.current_company_id() INTO v_test_result;
    IF v_test_result IS NULL THEN
      RAISE NOTICE '⚠️  current_company_id() retourne NULL (normal si aucun utilisateur connecté)';
    ELSE
      RAISE NOTICE '✅ current_company_id() retourne: %', v_test_result;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Erreur lors de l''appel à current_company_id(): %', SQLERRM;
  END;
END $$;

-- 9. RÉSUMÉ FINAL
SELECT 
  'RÉSUMÉ' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'clients' 
      AND relnamespace = 'public'::regnamespace
      AND (relforcerowsecurity OR relrowsecurity)
    ) THEN '✅ RLS Activé'
    ELSE '❌ RLS Désactivé'
  END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients') as policies_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgrelid = 'public.clients'::regclass 
      AND tgname = 'force_company_id'
      AND tgenabled = 'O'
    ) THEN '✅ Trigger Actif'
    ELSE '❌ Trigger Inactif'
  END as trigger_status,
  (SELECT COUNT(*) FROM public.clients WHERE company_id IS NULL) as orphaned_clients,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = 'current_company_id'
    ) THEN '✅ Fonction Existe'
    ELSE '❌ Fonction Manquante'
  END as function_status;
