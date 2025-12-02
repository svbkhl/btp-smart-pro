-- ============================================
-- AJOUT DE LA COLONNE actual_revenue À LA TABLE projects
-- ============================================
-- Ce script ajoute la colonne actual_revenue manquante
-- Exécutez-le dans Supabase Dashboard > SQL Editor
-- ============================================

-- Ajouter la colonne actual_revenue si elle n'existe pas
DO $$ 
BEGIN
  -- actual_revenue
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'actual_revenue'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN actual_revenue NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Colonne actual_revenue ajoutée à la table projects';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne actual_revenue existe déjà';
  END IF;
  
  -- Vérifier aussi que costs existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'costs'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN costs NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Colonne costs ajoutée à la table projects';
  END IF;
  
  -- Vérifier aussi que benefice existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'benefice'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN benefice NUMERIC;
    RAISE NOTICE '✅ Colonne benefice ajoutée à la table projects';
  END IF;
END $$;

