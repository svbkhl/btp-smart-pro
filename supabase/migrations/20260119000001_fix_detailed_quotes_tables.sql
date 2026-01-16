-- =====================================================
-- FIX DEVIS DÉTAILLÉ : VÉRIFICATION ET CRÉATION TABLES
-- =====================================================
-- Ce script vérifie l'existence des tables nécessaires
-- et les crée/modifie si nécessaire pour éviter les 404
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER/CRÉER quote_sections
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.ai_quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_sections_quote_id ON public.quote_sections(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_sections_company_id ON public.quote_sections(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_sections_position ON public.quote_sections(quote_id, position);

-- =====================================================
-- 2. VÉRIFIER/CRÉER quote_lines
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.ai_quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.quote_sections(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('labor', 'material', 'service', 'other')),
  unit TEXT,
  quantity NUMERIC(10,2),
  unit_price_ht NUMERIC(12,2),
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20 CHECK (tva_rate >= 0 AND tva_rate <= 1),
  total_tva NUMERIC(12,2) DEFAULT 0,
  total_ttc NUMERIC(12,2) DEFAULT 0,
  price_source TEXT CHECK (price_source IN ('manual', 'library', 'market_estimate', 'ai_estimate')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id ON public.quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_company_id ON public.quote_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_section_id ON public.quote_lines(section_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_position ON public.quote_lines(quote_id, position);

-- Ajouter section_id si la table existe déjà sans cette colonne
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quote_lines' 
    AND column_name = 'section_id'
  ) THEN
    ALTER TABLE public.quote_lines 
    ADD COLUMN section_id UUID REFERENCES public.quote_sections(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_quote_lines_section_id ON public.quote_lines(section_id);
  END IF;
END $$;

-- =====================================================
-- 3. VÉRIFIER/CRÉER quote_section_library
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_section_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_normalized TEXT NOT NULL,
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Supprimer ancienne contrainte UNIQUE si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_section_library_company_id_title_normalized_key'
    AND conrelid = 'public.quote_section_library'::regclass
  ) THEN
    ALTER TABLE public.quote_section_library 
    DROP CONSTRAINT quote_section_library_company_id_title_normalized_key;
  END IF;
END $$;

-- Créer contrainte UNIQUE si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_section_library_company_id_title_normalized_key'
    AND conrelid = 'public.quote_section_library'::regclass
  ) THEN
    ALTER TABLE public.quote_section_library 
    ADD CONSTRAINT quote_section_library_company_id_title_normalized_key 
    UNIQUE(company_id, title_normalized);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quote_section_library_company_id ON public.quote_section_library(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_section_library_title_normalized ON public.quote_section_library(company_id, title_normalized);
CREATE INDEX IF NOT EXISTS idx_quote_section_library_times_used ON public.quote_section_library(company_id, times_used DESC);

-- =====================================================
-- 4. VÉRIFIER/CRÉER quote_line_library
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_line_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  label_normalized TEXT NOT NULL,
  default_unit TEXT,
  default_unit_price_ht NUMERIC(12,2),
  default_category TEXT CHECK (default_category IN ('labor', 'material', 'service', 'other')),
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Supprimer anciennes contraintes UNIQUE si elles existent
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_line_library_company_id_label_normalized_key'
    AND conrelid = 'public.quote_line_library'::regclass
  ) THEN
    ALTER TABLE public.quote_line_library 
    DROP CONSTRAINT quote_line_library_company_id_label_normalized_key;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_line_library_company_id_label_unit_key'
    AND conrelid = 'public.quote_line_library'::regclass
  ) THEN
    ALTER TABLE public.quote_line_library 
    DROP CONSTRAINT quote_line_library_company_id_label_unit_key;
  END IF;
END $$;

-- Créer contrainte UNIQUE avec unit si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_line_library_company_id_label_unit_key'
    AND conrelid = 'public.quote_line_library'::regclass
  ) THEN
    ALTER TABLE public.quote_line_library 
    ADD CONSTRAINT quote_line_library_company_id_label_unit_key 
    UNIQUE(company_id, label_normalized, default_unit);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quote_line_library_company_id ON public.quote_line_library(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_library_label_normalized ON public.quote_line_library(company_id, label_normalized);
CREATE INDEX IF NOT EXISTS idx_quote_line_library_times_used ON public.quote_line_library(company_id, times_used DESC);

-- =====================================================
-- 5. VÉRIFIER/CRÉER company_settings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  default_tva_rate NUMERIC(5,4) DEFAULT 0.20 CHECK (default_tva_rate >= 0 AND default_tva_rate <= 1),
  default_quote_tva_rate NUMERIC(5,4) DEFAULT 0.20 CHECK (default_quote_tva_rate >= 0 AND default_quote_tva_rate <= 1),
  default_quote_mode TEXT DEFAULT 'simple' CHECK (default_quote_mode IN ('simple', 'detailed')),
  default_tva_293b BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter colonnes manquantes
DO $$
BEGIN
  -- default_tva_rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'default_tva_rate'
  ) THEN
    ALTER TABLE public.company_settings 
    ADD COLUMN default_tva_rate NUMERIC(5,4) DEFAULT 0.20 CHECK (default_tva_rate >= 0 AND default_tva_rate <= 1);
  END IF;

  -- default_quote_tva_rate (compatibilité)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'default_quote_tva_rate'
  ) THEN
    ALTER TABLE public.company_settings 
    ADD COLUMN default_quote_tva_rate NUMERIC(5,4) DEFAULT 0.20 CHECK (default_quote_tva_rate >= 0 AND default_quote_tva_rate <= 1);
  END IF;

  -- default_quote_mode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'default_quote_mode'
  ) THEN
    ALTER TABLE public.company_settings 
    ADD COLUMN default_quote_mode TEXT DEFAULT 'simple' CHECK (default_quote_mode IN ('simple', 'detailed'));
  END IF;

  -- default_tva_293b
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'default_tva_293b'
  ) THEN
    ALTER TABLE public.company_settings 
    ADD COLUMN default_tva_293b BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- 6. VÉRIFIER/ADAPTER ai_quotes (colonnes manquantes)
-- =====================================================

DO $$
BEGIN
  -- company_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_ai_quotes_company_id ON public.ai_quotes(company_id);
  END IF;

  -- client_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_ai_quotes_client_id ON public.ai_quotes(client_id);
  END IF;

  -- tva_rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'tva_rate'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN tva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20 CHECK (tva_rate >= 0 AND tva_rate <= 1);
  END IF;

  -- tva_non_applicable_293b
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'tva_non_applicable_293b'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN tva_non_applicable_293b BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- subtotal_ht, total_tva, total_ttc
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'subtotal_ht'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN subtotal_ht NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'total_tva'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN total_tva NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'total_ttc'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN total_ttc NUMERIC(12,2) DEFAULT 0;
  END IF;

  -- mode (simple/detailed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'mode'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN mode TEXT DEFAULT 'simple' CHECK (mode IN ('simple', 'detailed'));
  END IF;
END $$;

-- =====================================================
-- 7. CRÉER FONCTIONS UTILITAIRES (si elles n'existent pas)
-- =====================================================

-- Fonction normalize_section_title
CREATE OR REPLACE FUNCTION public.normalize_section_title(input_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(regexp_replace(input_title, '\s+', ' ', 'g')));
END;
$$;

-- Fonction normalize_label (pour quote_line_library)
CREATE OR REPLACE FUNCTION public.normalize_label(input_label TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(regexp_replace(input_label, '\s+', ' ', 'g')));
END;
$$;

-- Fonction recompute_quote_totals_with_293b (si elle n'existe pas)
CREATE OR REPLACE FUNCTION public.recompute_quote_totals_with_293b(p_quote_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal_ht NUMERIC := 0;
  v_total_tva NUMERIC := 0;
  v_total_ttc NUMERIC := 0;
  v_tva_rate NUMERIC;
  v_tva_293b BOOLEAN;
BEGIN
  -- Récupérer le taux TVA et l'option 293B du devis
  SELECT tva_rate, COALESCE(tva_non_applicable_293b, false) INTO v_tva_rate, v_tva_293b
  FROM public.ai_quotes
  WHERE id = p_quote_id;

  -- Si 293B est coché, forcer TVA à 0
  IF v_tva_293b THEN
    v_tva_rate := 0;
  END IF;

  -- Calculer les totaux depuis les lignes
  SELECT 
    COALESCE(SUM(total_ht), 0),
    COALESCE(SUM(total_tva), 0),
    COALESCE(SUM(total_ttc), 0)
  INTO v_subtotal_ht, v_total_tva, v_total_ttc
  FROM public.quote_lines
  WHERE quote_id = p_quote_id;

  -- Si 293B, recalculer TVA à 0
  IF v_tva_293b THEN
    v_total_tva := 0;
    v_total_ttc := v_subtotal_ht;
  ELSE
    -- Recalculer TVA selon le taux
    v_total_tva := ROUND(v_subtotal_ht * v_tva_rate, 2);
    v_total_ttc := ROUND(v_subtotal_ht + v_total_tva, 2);
  END IF;

  -- Arrondir
  v_subtotal_ht := ROUND(v_subtotal_ht, 2);
  v_total_tva := ROUND(v_total_tva, 2);
  v_total_ttc := ROUND(v_total_ttc, 2);

  -- Mettre à jour le devis
  UPDATE public.ai_quotes
  SET 
    subtotal_ht = v_subtotal_ht,
    total_tva = v_total_tva,
    total_ttc = v_total_ttc,
    tva_rate = v_tva_rate,
    updated_at = now()
  WHERE id = p_quote_id;
END;
$$;

-- =====================================================
-- 8. RLS (Row Level Security) - Activer et créer policies
-- =====================================================

-- Activer RLS
ALTER TABLE public.quote_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_section_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Fonction helper is_company_member (si elle n'existe pas)
CREATE OR REPLACE FUNCTION public.is_company_member(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.company_users 
    WHERE user_id = p_user_id 
    AND company_id = p_company_id
    AND (status = 'active' OR status IS NULL)
  );
END;
$$;

-- RLS quote_sections
DROP POLICY IF EXISTS "Users can view quote_sections of their companies" ON public.quote_sections;
CREATE POLICY "Users can view quote_sections of their companies"
  ON public.quote_sections FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can insert quote_sections in their companies" ON public.quote_sections;
CREATE POLICY "Users can insert quote_sections in their companies"
  ON public.quote_sections FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update quote_sections of their companies" ON public.quote_sections;
CREATE POLICY "Users can update quote_sections of their companies"
  ON public.quote_sections FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete quote_sections of their companies" ON public.quote_sections;
CREATE POLICY "Users can delete quote_sections of their companies"
  ON public.quote_sections FOR DELETE
  USING (public.is_company_member(auth.uid(), company_id));

-- RLS quote_lines
DROP POLICY IF EXISTS "Users can view quote_lines of their companies" ON public.quote_lines;
CREATE POLICY "Users can view quote_lines of their companies"
  ON public.quote_lines FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can insert quote_lines in their companies" ON public.quote_lines;
CREATE POLICY "Users can insert quote_lines in their companies"
  ON public.quote_lines FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update quote_lines of their companies" ON public.quote_lines;
CREATE POLICY "Users can update quote_lines of their companies"
  ON public.quote_lines FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete quote_lines of their companies" ON public.quote_lines;
CREATE POLICY "Users can delete quote_lines of their companies"
  ON public.quote_lines FOR DELETE
  USING (public.is_company_member(auth.uid(), company_id));

-- RLS quote_section_library
DROP POLICY IF EXISTS "Users can view quote_section_library of their companies" ON public.quote_section_library;
CREATE POLICY "Users can view quote_section_library of their companies"
  ON public.quote_section_library FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can manage quote_section_library of their companies" ON public.quote_section_library;
CREATE POLICY "Users can manage quote_section_library of their companies"
  ON public.quote_section_library FOR ALL
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- RLS quote_line_library
DROP POLICY IF EXISTS "Users can view quote_line_library of their companies" ON public.quote_line_library;
CREATE POLICY "Users can view quote_line_library of their companies"
  ON public.quote_line_library FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can manage quote_line_library of their companies" ON public.quote_line_library;
CREATE POLICY "Users can manage quote_line_library of their companies"
  ON public.quote_line_library FOR ALL
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- RLS company_settings
DROP POLICY IF EXISTS "Users can view company_settings of their companies" ON public.company_settings;
CREATE POLICY "Users can view company_settings of their companies"
  ON public.company_settings FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update company_settings of their companies" ON public.company_settings;
CREATE POLICY "Users can update company_settings of their companies"
  ON public.company_settings FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can insert company_settings of their companies" ON public.company_settings;
CREATE POLICY "Users can insert company_settings of their companies"
  ON public.company_settings FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- =====================================================
-- 9. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX DEVIS DÉTAILLÉ - MIGRATION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables vérifiées/créées :';
  RAISE NOTICE '  ✅ quote_sections';
  RAISE NOTICE '  ✅ quote_lines';
  RAISE NOTICE '  ✅ quote_section_library';
  RAISE NOTICE '  ✅ quote_line_library';
  RAISE NOTICE '  ✅ company_settings';
  RAISE NOTICE '';
  RAISE NOTICE 'Colonnes vérifiées/ajoutées dans ai_quotes :';
  RAISE NOTICE '  ✅ company_id, client_id';
  RAISE NOTICE '  ✅ tva_rate, tva_non_applicable_293b';
  RAISE NOTICE '  ✅ subtotal_ht, total_tva, total_ttc';
  RAISE NOTICE '  ✅ mode';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées/mises à jour :';
  RAISE NOTICE '  ✅ normalize_section_title()';
  RAISE NOTICE '  ✅ normalize_label()';
  RAISE NOTICE '  ✅ recompute_quote_totals_with_293b()';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS activé avec policies multi-tenant';
  RAISE NOTICE '========================================';
END $$;
