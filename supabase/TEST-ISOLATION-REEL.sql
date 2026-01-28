-- ============================================
-- TEST RÉEL D'ISOLATION - SIMULATION
-- ============================================
-- Ce script teste l'isolation en simulant deux utilisateurs
-- ============================================

-- 1. LISTER LES ENTREPRISES ET LEURS UTILISATEURS
SELECT 
  'Entreprises et utilisateurs' as section,
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT cu.user_id) as user_count,
  STRING_AGG(DISTINCT p.email, ', ' ORDER BY p.email) as user_emails
FROM public.companies c
LEFT JOIN public.company_users cu ON cu.company_id = c.id
LEFT JOIN public.profiles p ON p.id = cu.user_id
GROUP BY c.id, c.name
ORDER BY c.name
LIMIT 5;

-- 2. COMPTER LES CLIENTS PAR ENTREPRISE
SELECT 
  'Clients par entreprise' as section,
  company_id,
  COUNT(*) as client_count,
  STRING_AGG(name, ', ' ORDER BY name) FILTER (WHERE name IS NOT NULL) as client_names
FROM public.clients
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY company_id;

-- 3. VÉRIFIER LES CLIENTS RÉCENTS (derniers 10)
SELECT 
  'Clients récents' as section,
  id,
  name,
  company_id,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 10;

-- 4. VÉRIFIER SI DES CLIENTS ONT LE MÊME ID DANS PLUSIEURS ENTREPRISES (PROBLÈME)
SELECT 
  '⚠️ PROBLÈME: Doublons' as section,
  id,
  COUNT(DISTINCT company_id) as company_count,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids,
  STRING_AGG(DISTINCT name, ', ') as names
FROM public.clients
GROUP BY id
HAVING COUNT(DISTINCT company_id) > 1;

-- 5. VÉRIFIER LES CLIENTS SANS company_id (PROBLÈME)
SELECT 
  '⚠️ PROBLÈME: Clients sans company_id' as section,
  COUNT(*) as count,
  STRING_AGG(id::TEXT, ', ') as client_ids,
  STRING_AGG(name, ', ') as names
FROM public.clients
WHERE company_id IS NULL;

-- 6. TESTER LES POLICIES RLS
-- Note: Ceci nécessite un contexte d'authentification réel
-- Pour tester vraiment, vous devez vous connecter avec chaque utilisateur

-- 7. VÉRIFIER LA FONCTION current_company_id()
DO $$
DECLARE
  v_test_user_id UUID;
  v_test_company_id UUID;
BEGIN
  -- Récupérer un utilisateur de test
  SELECT cu.user_id, cu.company_id
  INTO v_test_user_id, v_test_company_id
  FROM public.company_users cu
  LIMIT 1;
  
  IF v_test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  Aucun utilisateur trouvé dans company_users';
    RETURN;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST DE current_company_id()';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Utilisateur test: %', v_test_user_id;
  RAISE NOTICE 'Company ID attendu: %', v_test_company_id;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Pour tester vraiment current_company_id(),';
  RAISE NOTICE '   vous devez vous connecter avec cet utilisateur';
  RAISE NOTICE '   dans l''application et vérifier les logs.';
  RAISE NOTICE '========================================';
END $$;

-- 8. RÉSUMÉ FINAL
SELECT 
  'RÉSUMÉ' as section,
  (SELECT COUNT(*) FROM public.companies) as total_companies,
  (SELECT COUNT(*) FROM public.company_users) as total_company_users,
  (SELECT COUNT(*) FROM public.clients) as total_clients,
  (SELECT COUNT(DISTINCT company_id) FROM public.clients WHERE company_id IS NOT NULL) as companies_with_clients,
  (SELECT COUNT(*) FROM public.clients WHERE company_id IS NULL) as clients_without_company_id,
  (SELECT COUNT(*) FROM (
    SELECT id FROM public.clients GROUP BY id HAVING COUNT(DISTINCT company_id) > 1
  ) sub) as duplicate_clients;
