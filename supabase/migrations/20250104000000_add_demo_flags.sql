-- ============================================
-- MIGRATION : Ajout des colonnes is_demo
-- ============================================
-- Ce script ajoute la colonne is_demo aux tables clés
-- pour identifier et gérer les données de démo
-- ============================================

-- Ajouter is_demo à la table clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN is_demo BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_clients_is_demo ON public.clients(is_demo);
    RAISE NOTICE '✅ Colonne is_demo ajoutée à clients';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne is_demo existe déjà dans clients';
  END IF;
END $$;

-- Ajouter is_demo à la table projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN is_demo BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_projects_is_demo ON public.projects(is_demo);
    RAISE NOTICE '✅ Colonne is_demo ajoutée à projects';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne is_demo existe déjà dans projects';
  END IF;
END $$;

-- Ajouter is_demo à la table ai_quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN is_demo BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_ai_quotes_is_demo ON public.ai_quotes(is_demo);
    RAISE NOTICE '✅ Colonne is_demo ajoutée à ai_quotes';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne is_demo existe déjà dans ai_quotes';
  END IF;
END $$;

-- Ajouter is_demo à la table notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_demo BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_notifications_is_demo ON public.notifications(is_demo);
    RAISE NOTICE '✅ Colonne is_demo ajoutée à notifications';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne is_demo existe déjà dans notifications';
  END IF;
END $$;

-- Ajouter is_demo à la table employees (si elle existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employees'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      AND column_name = 'is_demo'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN is_demo BOOLEAN DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_employees_is_demo ON public.employees(is_demo);
      RAISE NOTICE '✅ Colonne is_demo ajoutée à employees';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne is_demo existe déjà dans employees';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Table employees n''existe pas encore';
  END IF;
END $$;

-- Ajouter is_demo à la table candidatures (si elle existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'candidatures'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'candidatures' 
      AND column_name = 'is_demo'
    ) THEN
      ALTER TABLE public.candidatures ADD COLUMN is_demo BOOLEAN DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_candidatures_is_demo ON public.candidatures(is_demo);
      RAISE NOTICE '✅ Colonne is_demo ajoutée à candidatures';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne is_demo existe déjà dans candidatures';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Table candidatures n''existe pas encore';
  END IF;
END $$;

-- Ajouter is_demo à la table taches_rh (si elle existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'taches_rh'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'taches_rh' 
      AND column_name = 'is_demo'
    ) THEN
      ALTER TABLE public.taches_rh ADD COLUMN is_demo BOOLEAN DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_taches_rh_is_demo ON public.taches_rh(is_demo);
      RAISE NOTICE '✅ Colonne is_demo ajoutée à taches_rh';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne is_demo existe déjà dans taches_rh';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Table taches_rh n''existe pas encore';
  END IF;
END $$;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration terminée : Colonnes is_demo ajoutées';
  RAISE NOTICE '';
END $$;

