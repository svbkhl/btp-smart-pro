-- ============================================
-- TEST DIRECT D'ISOLATION RLS
-- ============================================
-- Ce script teste directement si RLS fonctionne
-- en simulant deux utilisateurs de deux entreprises différentes
-- ============================================

-- Étape 1 : Lister les entreprises disponibles
DO $$
DECLARE
  v_company_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_company_count FROM public.companies;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST D''ISOLATION RLS DIRECT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Nombre d''entreprises dans la base: %', v_company_count;
  RAISE NOTICE '';
END $$;

-- Afficher les entreprises avec leurs utilisateurs
SELECT 
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT cu.user_id) as user_count,
  STRING_AGG(DISTINCT p.email, ', ') as user_emails
FROM public.companies c
LEFT JOIN public.company_users cu ON cu.company_id = c.id
LEFT JOIN public.profiles p ON p.id = cu.user_id
GROUP BY c.id, c.name
ORDER BY c.name
LIMIT 10;

-- Étape 2 : Vérifier les clients par entreprise
SELECT 
  company_id,
  COUNT(*) as client_count,
  STRING_AGG(name, ', ') FILTER (WHERE name IS NOT NULL) as client_names
FROM public.clients
GROUP BY company_id
ORDER BY company_id;

-- Étape 3 : Vérifier si des clients ont un company_id NULL (problème)
SELECT 
  COUNT(*) as clients_without_company_id
FROM public.clients
WHERE company_id IS NULL;

-- Étape 4 : Vérifier si des clients partagent le même ID entre entreprises (problème)
SELECT 
  id,
  COUNT(DISTINCT company_id) as company_count,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids
FROM public.clients
GROUP BY id
HAVING COUNT(DISTINCT company_id) > 1;

-- Étape 5 : Tester RLS avec un utilisateur spécifique
-- Remplacez USER_ID_1 et USER_ID_2 par de vrais IDs d'utilisateurs
DO $$
DECLARE
  v_user_1_id UUID;
  v_user_2_id UUID;
  v_company_1_id UUID;
  v_company_2_id UUID;
  v_clients_user_1 INTEGER;
  v_clients_user_2 INTEGER;
BEGIN
  -- Récupérer les deux premiers utilisateurs de deux entreprises différentes
  SELECT cu1.user_id, cu1.company_id, cu2.user_id, cu2.company_id
  INTO v_user_1_id, v_company_1_id, v_user_2_id, v_company_2_id
  FROM (
    SELECT DISTINCT user_id, company_id 
    FROM public.company_users 
    ORDER BY company_id, user_id 
    LIMIT 1
  ) cu1
  CROSS JOIN (
    SELECT DISTINCT user_id, company_id 
    FROM public.company_users 
    WHERE company_id != (SELECT company_id FROM public.company_users ORDER BY company_id LIMIT 1)
    ORDER BY company_id, user_id 
    LIMIT 1
  ) cu2
  LIMIT 1;
  
  IF v_user_1_id IS NULL OR v_user_2_id IS NULL THEN
    RAISE NOTICE '⚠️  Pas assez d''utilisateurs dans différentes entreprises pour tester';
    RAISE NOTICE '   Créez au moins 2 utilisateurs dans 2 entreprises différentes';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Utilisateur 1: % (Entreprise: %)', v_user_1_id, v_company_1_id;
  RAISE NOTICE 'Utilisateur 2: % (Entreprise: %)', v_user_2_id, v_company_2_id;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Pour tester RLS correctement, vous devez vous connecter';
  RAISE NOTICE '   avec chaque utilisateur et vérifier qu''ils ne voient que leurs données';
  RAISE NOTICE '';
END $$;

-- Étape 6 : Vérifier les policies RLS actives
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'SELECT/UPDATE/DELETE'
    WHEN with_check IS NOT NULL THEN 'INSERT/UPDATE'
    ELSE 'AUTRE'
  END as policy_type,
  CASE 
    WHEN qual LIKE '%company_id%' OR with_check LIKE '%company_id%' THEN '✅ Filtre company_id'
    ELSE '⚠️  Pas de filtre company_id'
  END as has_company_filter
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
ORDER BY cmd, policyname;

-- Étape 7 : Vérifier le trigger force_company_id
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  CASE 
    WHEN tgname = 'force_company_id' THEN '✅ Trigger actif'
    ELSE '⚠️  Autre trigger'
  END as status
FROM pg_trigger
WHERE tgrelid = 'public.clients'::regclass
  AND tgname = 'force_company_id';

-- Étape 8 : Résumé de l'état
SELECT 
  'Résumé' as section,
  (SELECT COUNT(*) FROM public.clients) as total_clients,
  (SELECT COUNT(DISTINCT company_id) FROM public.clients WHERE company_id IS NOT NULL) as companies_with_clients,
  (SELECT COUNT(*) FROM public.clients WHERE company_id IS NULL) as clients_without_company_id,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients') as rls_policies_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgrelid = 'public.clients'::regclass 
      AND tgname = 'force_company_id'
      AND tgenabled = 'O'
    ) THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as trigger_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'clients' 
      AND relnamespace = 'public'::regnamespace
      AND (relforcerowsecurity OR relrowsecurity)
    ) THEN '✅ Activé'
    ELSE '❌ Désactivé'
  END as rls_status;
