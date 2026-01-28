-- =====================================================
-- TEST COMPLET : Suppression de client
-- =====================================================
-- Ce script teste la suppression d'un client pour
-- identifier le problème d'isolation multi-tenant
-- =====================================================

DO $$
DECLARE
  v_client_id UUID;
  v_company_id_1 UUID;
  v_company_id_2 UUID;
  v_client_count_before INTEGER;
  v_client_count_after INTEGER;
  v_client_company_id UUID;
BEGIN
  -- 1. Récupérer deux company_id différents
  SELECT id INTO v_company_id_1 FROM public.companies ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_company_id_2 FROM public.companies ORDER BY created_at DESC LIMIT 1;
  
  RAISE NOTICE 'Company ID 1: %', v_company_id_1;
  RAISE NOTICE 'Company ID 2: %', v_company_id_2;
  
  -- 2. Trouver un client de l'entreprise 1
  SELECT id, company_id INTO v_client_id, v_client_company_id
  FROM public.clients
  WHERE company_id = v_company_id_1
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Aucun client trouvé pour company_id_1';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Client trouvé: ID=%, company_id=%', v_client_id, v_client_company_id;
  
  -- 3. Compter combien de clients avec cet ID existent (toutes entreprises confondues)
  SELECT COUNT(*) INTO v_client_count_before
  FROM public.clients
  WHERE id = v_client_id;
  
  RAISE NOTICE 'Nombre de clients avec cet ID (toutes entreprises): %', v_client_count_before;
  
  -- 4. Vérifier si ce client existe dans l'entreprise 2
  SELECT COUNT(*) INTO v_client_count_after
  FROM public.clients
  WHERE id = v_client_id AND company_id = v_company_id_2;
  
  RAISE NOTICE 'Nombre de clients avec cet ID dans entreprise 2: %', v_client_count_after;
  
  -- 5. Lister tous les clients avec cet ID et leurs company_id
  RAISE NOTICE '=== TOUS LES CLIENTS AVEC CET ID ===';
  FOR v_client_company_id IN 
    SELECT company_id FROM public.clients WHERE id = v_client_id
  LOOP
    RAISE NOTICE 'Client ID=% existe dans company_id=%', v_client_id, v_client_company_id;
  END LOOP;
  
  -- 6. Vérifier les RLS policies DELETE actives
  RAISE NOTICE '=== RLS POLICIES DELETE POUR CLIENTS ===';
  FOR rec IN 
    SELECT 
      policyname,
      permissive,
      roles,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'clients'
      AND cmd = 'DELETE'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Qual: %, WithCheck: %', 
      rec.policyname, rec.permissive, rec.roles, rec.qual, rec.with_check;
  END LOOP;
  
  -- 7. Vérifier si RLS est activé
  SELECT relforcerowsecurity INTO v_client_count_before
  FROM pg_class
  WHERE relname = 'clients' AND relnamespace = 'public'::regnamespace;
  
  RAISE NOTICE 'RLS activé pour clients: %', v_client_count_before;
  
END $$;

-- 8. Vérifier les triggers sur la table clients
SELECT 
  'Triggers sur clients' as info,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'clients'
  AND event_object_schema = 'public';

-- 9. Vérifier la fonction current_company_id()
SELECT 
  'Fonction current_company_id' as info,
  proname,
  prosrc
FROM pg_proc
WHERE proname = 'current_company_id';

-- 10. Lister les clients avec leurs company_id (échantillon)
SELECT 
  'Échantillon de clients' as info,
  id,
  name,
  company_id,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 10;
