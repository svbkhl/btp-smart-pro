-- =====================================================
-- MIGRATION : Ajouter colonne prenom à clients
-- =====================================================
-- Ce script ajoute la colonne prenom à la table clients
-- et retire VIP du statut CHECK constraint
-- =====================================================

-- 1. Ajouter la colonne titre si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'titre'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN titre TEXT CHECK (titre IS NULL OR titre IN ('M.', 'Mme'));
    RAISE NOTICE '✅ Colonne titre ajoutée à la table clients';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne titre existe déjà';
  END IF;
END $$;

-- 2. Ajouter la colonne prenom si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'prenom'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN prenom TEXT;
    RAISE NOTICE '✅ Colonne prenom ajoutée à la table clients';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne prenom existe déjà';
  END IF;
END $$;

-- 3. Modifier le CHECK constraint pour retirer VIP du statut
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  ALTER TABLE public.clients 
    DROP CONSTRAINT IF EXISTS clients_status_check;
  
  -- Créer la nouvelle contrainte sans VIP
  ALTER TABLE public.clients 
    ADD CONSTRAINT clients_status_check 
    CHECK (status IS NULL OR status IN ('actif', 'terminé', 'planifié'));
  
  RAISE NOTICE '✅ Contrainte de statut mise à jour (VIP retiré)';
END $$;

-- 4. Mettre à jour les clients existants avec status = 'VIP' vers 'actif'
UPDATE public.clients 
SET status = 'actif' 
WHERE status = 'VIP';

-- Afficher le résultat
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ % client(s) avec statut VIP mis à jour vers actif', v_updated_count;
  ELSE
    RAISE NOTICE 'ℹ️ Aucun client avec statut VIP trouvé';
  END IF;
END $$;

-- =====================================================
-- VÉRIFICATION
-- =====================================================
-- Vérifier que les colonnes titre et prenom existent
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients' 
  AND column_name IN ('titre', 'prenom')
ORDER BY column_name;

-- Vérifier qu'il n'y a plus de clients avec status = 'VIP'
SELECT COUNT(*) as clients_vip_restants
FROM public.clients
WHERE status = 'VIP';
