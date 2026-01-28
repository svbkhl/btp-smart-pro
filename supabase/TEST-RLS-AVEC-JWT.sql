-- ============================================
-- TEST RLS AVEC SIMULATION JWT
-- ============================================
-- Ce script teste si RLS fonctionne vraiment en simulant
-- les requêtes comme si elles venaient de l'application
-- ============================================

-- 1. Lister les utilisateurs et leurs company_id
SELECT 
  '📋 Utilisateurs disponibles pour test' as test_type,
  p.id as user_id,
  p.email,
  cu.company_id,
  c.name as company_name
FROM public.profiles p
JOIN public.company_users cu ON cu.user_id = p.id
JOIN public.companies c ON c.id = cu.company_id
ORDER BY p.email, cu.created_at
LIMIT 10;

-- 2. Vérifier la fonction current_company_id() pour chaque utilisateur
DO $$
DECLARE
  v_user_record RECORD;
  v_company_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST DE current_company_id() PAR UTILISATEUR';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOR v_user_record IN 
    SELECT DISTINCT p.id as user_id, p.email, cu.company_id
    FROM public.profiles p
    JOIN public.company_users cu ON cu.user_id = p.id
    LIMIT 5
  LOOP
    -- Simuler l'authentification avec cet utilisateur
    -- Note: Ceci ne fonctionne que si le contexte auth est disponible
    RAISE NOTICE 'Utilisateur: % (%)', v_user_record.email, v_user_record.user_id;
    RAISE NOTICE '  Company ID attendu: %', v_user_record.company_id;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE '   Ce test ne peut pas simuler complètement les JWT tokens';
  RAISE NOTICE '   Pour tester vraiment RLS, vous devez:';
  RAISE NOTICE '   1. Vous connecter dans l''application';
  RAISE NOTICE '   2. Ouvrir la console (F12)';
  RAISE NOTICE '   3. Vérifier les logs [getCurrentCompanyId] et [useClients]';
  RAISE NOTICE '========================================';
END $$;

-- 3. Vérifier les policies RLS actives
SELECT 
  '🔒 Policies RLS sur clients' as test_type,
  policyname,
  cmd as operation,
  qual as condition_select,
  with_check as condition_insert_update
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
ORDER BY cmd, policyname;

-- 4. Compter les clients par company_id
SELECT 
  '📊 Distribution des clients' as test_type,
  company_id,
  COUNT(*) as client_count,
  STRING_AGG(name, ', ' ORDER BY created_at DESC) FILTER (WHERE name IS NOT NULL) as recent_clients
FROM public.clients
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY client_count DESC;

-- 5. Vérifier s'il y a des clients qui devraient être filtrés par RLS
DO $$
DECLARE
  v_total_clients INTEGER;
  v_total_companies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_clients FROM public.clients;
  SELECT COUNT(DISTINCT company_id) INTO v_total_companies FROM public.clients WHERE company_id IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total clients: %', v_total_clients;
  RAISE NOTICE 'Total entreprises avec clients: %', v_total_companies;
  RAISE NOTICE '';
  RAISE NOTICE 'Si RLS fonctionne correctement:';
  RAISE NOTICE '- Chaque utilisateur ne devrait voir que les clients de SON entreprise';
  RAISE NOTICE '- Un utilisateur de l''entreprise A ne doit PAS voir les clients de B';
  RAISE NOTICE '';
  RAISE NOTICE 'Pour vérifier:';
  RAISE NOTICE '1. Connectez-vous dans l''application avec Entreprise A';
  RAISE NOTICE '2. Ouvrez la console (F12)';
  RAISE NOTICE '3. Allez sur /clients';
  RAISE NOTICE '4. Cherchez dans les logs: [useClients] AFTER QUERY';
  RAISE NOTICE '5. Vérifiez que TOUS les clients ont le même company_id';
  RAISE NOTICE '6. Si certains clients ont un company_id différent = RLS ne fonctionne pas';
  RAISE NOTICE '========================================';
END $$;
