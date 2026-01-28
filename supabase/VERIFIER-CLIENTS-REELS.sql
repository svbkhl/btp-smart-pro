-- =====================================================
-- VÉRIFICATION : Clients réels dans la base de données
-- =====================================================
-- Ce script vérifie l'état réel des clients dans la base
-- pour distinguer un problème de données d'un problème d'affichage
-- =====================================================

DO $$
DECLARE
  v_total_clients INTEGER;
  v_clients_sans_company_id INTEGER;
  v_clients_dupliques INTEGER;
  v_info_text TEXT;
BEGIN
  -- 1. Compter TOUS les clients (sans filtrage)
  SELECT COUNT(*) INTO v_total_clients FROM public.clients;
  RAISE NOTICE '📊 Total clients dans la base: %', v_total_clients;

  -- 2. Compter les clients sans company_id
  SELECT COUNT(*) INTO v_clients_sans_company_id 
  FROM public.clients 
  WHERE company_id IS NULL;
  
  IF v_clients_sans_company_id > 0 THEN
    RAISE WARNING '⚠️ Il y a % client(s) sans company_id', v_clients_sans_company_id;
  ELSE
    RAISE NOTICE '✅ Tous les clients ont un company_id';
  END IF;

  -- 3. Vérifier s'il y a des clients avec le même ID (PROBLÈME CRITIQUE)
  SELECT COUNT(*) INTO v_clients_dupliques
  FROM (
    SELECT id
    FROM public.clients
    GROUP BY id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_clients_dupliques > 0 THEN
    RAISE WARNING '❌ CRITIQUE: Il y a % client(s) avec le même ID dans plusieurs entreprises!', v_clients_dupliques;
  ELSE
    RAISE NOTICE '✅ Aucun client ne partage d''ID (normal avec UUID)';
  END IF;

  -- 4. Compter les clients par entreprise
  RAISE NOTICE '';
  RAISE NOTICE '📊 Clients par entreprise:';
  FOR v_info_text IN
    SELECT FORMAT('  Entreprise %s: %s client(s)', company_id::TEXT, COUNT(*)::TEXT)
    FROM public.clients
    WHERE company_id IS NOT NULL
    GROUP BY company_id
    ORDER BY COUNT(*) DESC
  LOOP
    RAISE NOTICE '%', v_info_text;
  END LOOP;

  -- 5. Vérifier les contraintes
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'clients'
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ PRIMARY KEY existe sur la table clients (garantit l''unicité des IDs)';
  ELSE
    RAISE WARNING '⚠️ Pas de PRIMARY KEY sur la table clients (PROBLÈME!)';
  END IF;

  -- 6. Vérifier RLS
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'clients'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS est activé sur la table clients';
  ELSE
    RAISE WARNING '⚠️ RLS n''est PAS activé sur la table clients (PROBLÈME!)';
  END IF;

  -- 7. Compter les policies DELETE
  SELECT COUNT(*) INTO v_clients_dupliques
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'DELETE';
  
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Il y a % policy(ies) DELETE sur la table clients', v_clients_dupliques;
  
  IF v_clients_dupliques = 0 THEN
    RAISE WARNING '⚠️ Aucune policy DELETE - les suppressions ne seront pas autorisées!';
  ELSIF v_clients_dupliques > 1 THEN
    RAISE WARNING '⚠️ Plusieurs policies DELETE actives - vérifiez qu''elles sont correctes!';
  ELSE
    RAISE NOTICE '✅ Exactement 1 policy DELETE (comme souhaité)';
  END IF;

END $$;

-- Afficher les clients avec le même ID (si il y en a)
SELECT 
  id,
  COUNT(*) as occurrences,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids,
  STRING_AGG(DISTINCT name, ' | ') as noms
FROM public.clients
GROUP BY id
HAVING COUNT(*) > 1;
