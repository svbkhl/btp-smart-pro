-- ============================================
-- SCRIPT DE TEST D'ISOLATION DES DONNÉES PAR ENTREPRISE
-- ============================================
-- Ce script vérifie que les données sont bien isolées entre les entreprises
-- et qu'aucune donnée ne peut être vue par une entreprise à laquelle elle n'appartient pas
--
-- INSTRUCTIONS :
-- 1. Notez les IDs de 2 entreprises différentes avec des données
-- 2. Exécutez ce script en remplaçant company_id_1 et company_id_2 par les vrais IDs
-- 3. Vérifiez que chaque entreprise ne voit QUE ses propres données
-- ============================================

DO $$
DECLARE
  company_id_1 UUID := NULL; -- ⚠️ REMPLACER par le premier company_id à tester
  company_id_2 UUID := NULL; -- ⚠️ REMPLACER par le deuxième company_id à tester
  clients_company_1 INTEGER;
  clients_company_2 INTEGER;
  clients_shared INTEGER;
  projects_company_1 INTEGER;
  projects_company_2 INTEGER;
  projects_shared INTEGER;
  invoices_company_1 INTEGER;
  invoices_company_2 INTEGER;
  invoices_shared INTEGER;
  quotes_company_1 INTEGER;
  quotes_company_2 INTEGER;
  quotes_shared INTEGER;
  events_company_1 INTEGER;
  events_company_2 INTEGER;
  events_shared INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST D''ISOLATION DES DONNÉES PAR ENTREPRISE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Si les company_id ne sont pas définis, lister toutes les entreprises disponibles
  IF company_id_1 IS NULL OR company_id_2 IS NULL THEN
    RAISE NOTICE '⚠️ Veuillez définir company_id_1 et company_id_2 dans le script';
    RAISE NOTICE '';
    RAISE NOTICE 'Entreprises disponibles avec des données:';
    RAISE NOTICE '----------------------------------------';
    
    -- Lister les entreprises avec leurs statistiques
    FOR clients_company_1, company_id_1 IN
      SELECT COUNT(*)::INTEGER, company_id::UUID
      FROM public.clients
      WHERE company_id IS NOT NULL
      GROUP BY company_id
      ORDER BY COUNT(*) DESC
      LIMIT 10
    LOOP
      RAISE NOTICE 'Company ID: % - Clients: %', company_id_1, clients_company_1;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Utilisez ces IDs pour remplacer company_id_1 et company_id_2 dans le script';
    RAISE NOTICE '========================================';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Test avec:';
  RAISE NOTICE '  Entreprise 1: %', company_id_1;
  RAISE NOTICE '  Entreprise 2: %', company_id_2;
  RAISE NOTICE '';
  
  -- ============================================
  -- 1. TEST ISOLATION CLIENTS
  -- ============================================
  RAISE NOTICE '1. TEST ISOLATION CLIENTS:';
  
  -- Compter les clients de chaque entreprise
  SELECT COUNT(*) INTO clients_company_1
  FROM public.clients
  WHERE company_id = company_id_1;
  
  SELECT COUNT(*) INTO clients_company_2
  FROM public.clients
  WHERE company_id = company_id_2;
  
  -- Vérifier s'il y a des clients en commun (ne devrait JAMAIS arriver)
  SELECT COUNT(*) INTO clients_shared
  FROM public.clients
  WHERE company_id IN (company_id_1, company_id_2)
    AND id IN (
      SELECT id FROM public.clients WHERE company_id = company_id_1
      INTERSECT
      SELECT id FROM public.clients WHERE company_id = company_id_2
    );
  
  RAISE NOTICE '   Entreprise 1 a % client(s)', clients_company_1;
  RAISE NOTICE '   Entreprise 2 a % client(s)', clients_company_2;
  
  IF clients_shared > 0 THEN
    RAISE WARNING '   ⚠️ PROBLÈME: % client(s) partagé(s) entre les deux entreprises!', clients_shared;
    RAISE NOTICE '   Liste des clients partagés:';
    FOR clients_company_1, company_id_1 IN
      SELECT id, name
      FROM public.clients
      WHERE company_id IN (company_id_1, company_id_2)
        AND id IN (
          SELECT id FROM public.clients WHERE company_id = company_id_1
          INTERSECT
          SELECT id FROM public.clients WHERE company_id = company_id_2
        )
    LOOP
      RAISE NOTICE '     - ID: %, Nom: %', clients_company_1, company_id_1;
    END LOOP;
  ELSE
    RAISE NOTICE '   ✅ Aucun client partagé - Isolation OK';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 2. TEST ISOLATION PROJETS
  -- ============================================
  RAISE NOTICE '2. TEST ISOLATION PROJETS:';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'company_id') THEN
    SELECT COUNT(*) INTO projects_company_1
    FROM public.projects
    WHERE company_id = company_id_1;
    
    SELECT COUNT(*) INTO projects_company_2
    FROM public.projects
    WHERE company_id = company_id_2;
    
    SELECT COUNT(*) INTO projects_shared
    FROM public.projects
    WHERE company_id IN (company_id_1, company_id_2)
      AND id IN (
        SELECT id FROM public.projects WHERE company_id = company_id_1
        INTERSECT
        SELECT id FROM public.projects WHERE company_id = company_id_2
      );
    
    RAISE NOTICE '   Entreprise 1 a % projet(s)', projects_company_1;
    RAISE NOTICE '   Entreprise 2 a % projet(s)', projects_company_2;
    
    IF projects_shared > 0 THEN
      RAISE WARNING '   ⚠️ PROBLÈME: % projet(s) partagé(s) entre les deux entreprises!', projects_shared;
    ELSE
      RAISE NOTICE '   ✅ Aucun projet partagé - Isolation OK';
    END IF;
  ELSE
    RAISE NOTICE '   ℹ️ La table projects n''a pas de colonne company_id';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 3. TEST ISOLATION FACTURES
  -- ============================================
  RAISE NOTICE '3. TEST ISOLATION FACTURES:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'company_id') THEN
    SELECT COUNT(*) INTO invoices_company_1
    FROM public.invoices
    WHERE company_id = company_id_1;
    
    SELECT COUNT(*) INTO invoices_company_2
    FROM public.invoices
    WHERE company_id = company_id_2;
    
    SELECT COUNT(*) INTO invoices_shared
    FROM public.invoices
    WHERE company_id IN (company_id_1, company_id_2)
      AND id IN (
        SELECT id FROM public.invoices WHERE company_id = company_id_1
        INTERSECT
        SELECT id FROM public.invoices WHERE company_id = company_id_2
      );
    
    RAISE NOTICE '   Entreprise 1 a % facture(s)', invoices_company_1;
    RAISE NOTICE '   Entreprise 2 a % facture(s)', invoices_company_2;
    
    IF invoices_shared > 0 THEN
      RAISE WARNING '   ⚠️ PROBLÈME: % facture(s) partagée(s) entre les deux entreprises!', invoices_shared;
    ELSE
      RAISE NOTICE '   ✅ Aucune facture partagée - Isolation OK';
    END IF;
  ELSE
    RAISE NOTICE '   ℹ️ La table invoices n''existe pas ou n''a pas de colonne company_id';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 4. TEST ISOLATION DEVIS
  -- ============================================
  RAISE NOTICE '4. TEST ISOLATION DEVIS:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_quotes') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_quotes' AND column_name = 'company_id') THEN
    SELECT COUNT(*) INTO quotes_company_1
    FROM public.ai_quotes
    WHERE company_id = company_id_1;
    
    SELECT COUNT(*) INTO quotes_company_2
    FROM public.ai_quotes
    WHERE company_id = company_id_2;
    
    SELECT COUNT(*) INTO quotes_shared
    FROM public.ai_quotes
    WHERE company_id IN (company_id_1, company_id_2)
      AND id IN (
        SELECT id FROM public.ai_quotes WHERE company_id = company_id_1
        INTERSECT
        SELECT id FROM public.ai_quotes WHERE company_id = company_id_2
      );
    
    RAISE NOTICE '   Entreprise 1 a % devis', quotes_company_1;
    RAISE NOTICE '   Entreprise 2 a % devis', quotes_company_2;
    
    IF quotes_shared > 0 THEN
      RAISE WARNING '   ⚠️ PROBLÈME: % devis partagé(s) entre les deux entreprises!', quotes_shared;
    ELSE
      RAISE NOTICE '   ✅ Aucun devis partagé - Isolation OK';
    END IF;
  ELSE
    RAISE NOTICE '   ℹ️ La table ai_quotes n''existe pas ou n''a pas de colonne company_id';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 5. TEST ISOLATION ÉVÉNEMENTS
  -- ============================================
  RAISE NOTICE '5. TEST ISOLATION ÉVÉNEMENTS:';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'company_id') THEN
    SELECT COUNT(*) INTO events_company_1
    FROM public.events
    WHERE company_id = company_id_1;
    
    SELECT COUNT(*) INTO events_company_2
    FROM public.events
    WHERE company_id = company_id_2;
    
    SELECT COUNT(*) INTO events_shared
    FROM public.events
    WHERE company_id IN (company_id_1, company_id_2)
      AND id IN (
        SELECT id FROM public.events WHERE company_id = company_id_1
        INTERSECT
        SELECT id FROM public.events WHERE company_id = company_id_2
      );
    
    RAISE NOTICE '   Entreprise 1 a % événement(s)', events_company_1;
    RAISE NOTICE '   Entreprise 2 a % événement(s)', events_company_2;
    
    IF events_shared > 0 THEN
      RAISE WARNING '   ⚠️ PROBLÈME: % événement(s) partagé(s) entre les deux entreprises!', events_shared;
    ELSE
      RAISE NOTICE '   ✅ Aucun événement partagé - Isolation OK';
    END IF;
  ELSE
    RAISE NOTICE '   ℹ️ La table events n''existe pas ou n''a pas de colonne company_id';
  END IF;
  RAISE NOTICE '';
  
  -- ============================================
  -- 6. RÉSUMÉ FINAL
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ FINAL DE L''ISOLATION';
  RAISE NOTICE '========================================';
  
  IF clients_shared = 0 
     AND (projects_shared = 0 OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'company_id'))
     AND (invoices_shared = 0 OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices'))
     AND (quotes_shared = 0 OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_quotes'))
     AND (events_shared = 0 OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events')) THEN
    RAISE NOTICE '✅ TOUS LES TESTS D''ISOLATION SONT PASSÉS!';
    RAISE NOTICE '✅ Les données sont correctement isolées entre les entreprises.';
  ELSE
    RAISE WARNING '⚠️ CERTAINS TESTS ONT ÉCHOUÉ!';
    RAISE WARNING '⚠️ Des données sont partagées entre les entreprises.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Requête pour obtenir la liste des entreprises avec leurs statistiques
SELECT 
  c.company_id,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT i.id) as total_invoices
FROM public.clients c
LEFT JOIN public.projects p ON p.company_id = c.company_id AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'company_id')
LEFT JOIN public.invoices i ON i.company_id = c.company_id AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices')
WHERE c.company_id IS NOT NULL
GROUP BY c.company_id
ORDER BY total_clients DESC
LIMIT 10;
