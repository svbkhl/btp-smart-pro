-- ============================================
-- FIX COMPLET: Ajouter toutes les colonnes manquantes
-- ============================================
-- Ce script vérifie et ajoute toutes les colonnes manquantes
-- pour toutes les tables du backend
-- ============================================

-- ============================================
-- FIX: ai_quotes
-- ============================================
DO $$ 
BEGIN
  -- Vérifier que la table existe avant d'ajouter des colonnes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ai_quotes'
  ) THEN
    -- quote_number
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'quote_number'
    ) THEN
      ALTER TABLE public.ai_quotes ADD COLUMN quote_number TEXT UNIQUE;
    END IF;
  
    -- signature_data
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'signature_data'
    ) THEN
      ALTER TABLE public.ai_quotes ADD COLUMN signature_data TEXT;
    END IF;
    
    -- signed_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'signed_at'
    ) THEN
      ALTER TABLE public.ai_quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- signed_by
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'signed_by'
    ) THEN
      ALTER TABLE public.ai_quotes ADD COLUMN signed_by TEXT;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: notifications
-- ============================================
DO $$ 
BEGIN
  -- Vérifier que la table existe avant d'ajouter des colonnes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    -- read
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT false;
    END IF;
    
    -- link
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: projects
-- ============================================
DO $$ 
BEGIN
  -- Vérifier que la table existe avant d'ajouter des colonnes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    -- costs
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'costs'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN costs NUMERIC DEFAULT 0;
    END IF;
    
    -- benefice
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'benefice'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN benefice NUMERIC;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: user_stats
-- ============================================
DO $$ 
BEGIN
  -- Vérifier que la table existe avant d'ajouter des colonnes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_stats'
  ) THEN
    -- total_profit
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_stats' AND column_name = 'total_profit'
    ) THEN
      ALTER TABLE public.user_stats ADD COLUMN total_profit NUMERIC DEFAULT 0;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: user_settings
-- ============================================
DO $$ 
BEGIN
  -- Vérifier que la table existe avant d'ajouter des colonnes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_settings'
  ) THEN
    -- city
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'city'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN city TEXT;
    END IF;
  
    -- postal_code
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'postal_code'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN postal_code TEXT;
    END IF;
    
    -- country
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'country'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN country TEXT DEFAULT 'France';
    END IF;
    
    -- siret
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'siret'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN siret TEXT;
    END IF;
    
    -- vat_number
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'vat_number'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN vat_number TEXT;
    END IF;
    
    -- legal_form
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'legal_form'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN legal_form TEXT;
    END IF;
    
    -- company_logo_url
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'company_logo_url'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN company_logo_url TEXT;
    END IF;
    
    -- terms_and_conditions
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'terms_and_conditions'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN terms_and_conditions TEXT;
    END IF;
    
    -- signature_data
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'signature_data'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN signature_data TEXT;
    END IF;
  
    -- signature_name
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'signature_name'
    ) THEN
      ALTER TABLE public.user_settings ADD COLUMN signature_name TEXT;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: employees
-- ============================================
DO $$ 
BEGIN
  -- Vérifier que la table existe avant d'ajouter des colonnes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'employees'
  ) THEN
    -- statut
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'statut'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'congé', 'suspension'));
    END IF;
  
    -- team_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'team_id'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN team_id UUID;
    END IF;
    
    -- date_entree
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'date_entree'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN date_entree DATE;
    END IF;
    
    -- date_fin_contrat
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'date_fin_contrat'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN date_fin_contrat DATE;
    END IF;
    
    -- telephone
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'telephone'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN telephone TEXT;
    END IF;
    
    -- adresse
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'adresse'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN adresse TEXT;
    END IF;
    
    -- salaire_base
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'salaire_base'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN salaire_base NUMERIC;
    END IF;
  
    -- email
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'email'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN email TEXT;
    END IF;
  END IF;
END $$;

-- ============================================
-- CRÉER LES INDEXES MANQUANTS
-- ============================================

-- Index pour ai_quotes.quote_number (seulement si la table et la colonne existent)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ai_quotes'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'quote_number'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ai_quotes_quote_number ON public.ai_quotes(quote_number) WHERE quote_number IS NOT NULL;
  END IF;
END $$;

-- Index pour notifications.read (seulement si la table et la colonne existent)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
  END IF;
END $$;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
  'Vérification' as section,
  table_name,
  column_name,
  data_type,
  '✅ Ajoutée' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
  (table_name = 'ai_quotes' AND column_name IN ('quote_number', 'signature_data', 'signed_at', 'signed_by'))
  OR (table_name = 'notifications' AND column_name IN ('read', 'link'))
  OR (table_name = 'projects' AND column_name IN ('costs', 'benefice'))
  OR (table_name = 'user_stats' AND column_name = 'total_profit')
  OR (table_name = 'user_settings' AND column_name IN ('city', 'postal_code', 'country', 'siret', 'vat_number', 'legal_form', 'company_logo_url', 'terms_and_conditions', 'signature_data', 'signature_name'))
  OR (table_name = 'employees' AND column_name IN ('statut', 'team_id', 'date_entree', 'date_fin_contrat', 'telephone', 'adresse', 'salaire_base', 'email'))
)
ORDER BY table_name, column_name;

