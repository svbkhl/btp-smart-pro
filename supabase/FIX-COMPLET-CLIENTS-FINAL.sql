-- ================================================================
-- 🔧 FIX COMPLET : Colonnes clients + Diagnostic
-- ================================================================
-- Ce script :
-- 1. Ajoute les colonnes manquantes (titre, prenom) si nécessaires
-- 2. Vérifie la structure complète de la table
-- 3. Affiche les derniers clients créés avec TOUS les champs
-- ================================================================

DO $$
DECLARE
  v_titre_exists BOOLEAN;
  v_prenom_exists BOOLEAN;
  v_company_id_exists BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSTIC COMPLET DE LA TABLE CLIENTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Vérifier si les colonnes existent
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'titre'
  ) INTO v_titre_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'prenom'
  ) INTO v_prenom_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'company_id'
  ) INTO v_company_id_exists;
  
  RAISE NOTICE '📊 ÉTAT DES COLONNES :';
  RAISE NOTICE '  - titre: %', CASE WHEN v_titre_exists THEN '✅ Existe' ELSE '❌ Manquante' END;
  RAISE NOTICE '  - prenom: %', CASE WHEN v_prenom_exists THEN '✅ Existe' ELSE '❌ Manquante' END;
  RAISE NOTICE '  - company_id: %', CASE WHEN v_company_id_exists THEN '✅ Existe' ELSE '❌ Manquante' END;
  RAISE NOTICE '';
  
  -- Ajouter la colonne titre si elle n'existe pas
  IF NOT v_titre_exists THEN
    ALTER TABLE public.clients ADD COLUMN titre TEXT CHECK (titre IS NULL OR titre IN ('M.', 'Mme'));
    RAISE NOTICE '✅ Colonne titre AJOUTÉE avec succès';
  END IF;
  
  -- Ajouter la colonne prenom si elle n'existe pas
  IF NOT v_prenom_exists THEN
    ALTER TABLE public.clients ADD COLUMN prenom TEXT;
    RAISE NOTICE '✅ Colonne prenom AJOUTÉE avec succès';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX TERMINÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
END $$;

-- Afficher la structure COMPLÈTE de la table clients
RAISE NOTICE '';
RAISE NOTICE '📋 STRUCTURE COMPLÈTE DE LA TABLE :';
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- Afficher les 3 derniers clients créés avec TOUS les champs
RAISE NOTICE '';
RAISE NOTICE '👥 LES 3 DERNIERS CLIENTS CRÉÉS :';
SELECT 
  id,
  name,
  prenom,
  titre,
  email,
  phone,
  location,
  company_id,
  user_id,
  status,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 3;

-- Compter les clients par company_id
RAISE NOTICE '';
RAISE NOTICE '📊 RÉPARTITION DES CLIENTS PAR ENTREPRISE :';
SELECT 
  COALESCE(company_id::text, 'NULL') as company_id,
  COUNT(*) as nombre_clients
FROM public.clients
GROUP BY company_id
ORDER BY COUNT(*) DESC;
