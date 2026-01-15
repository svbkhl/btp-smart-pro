-- =====================================================
-- REFONTE MODULE DEVIS PRO
-- =====================================================
-- Migration complète pour :
-- 1. Adapter ai_quotes (mode, TVA, totaux, company_id)
-- 2. Créer quote_lines (lignes détaillées)
-- 3. Créer quote_line_library (bibliothèque réutilisable)
-- 4. Créer materials_price_catalog (référentiel prix)
-- 5. Adapter company_settings (préférences TVA/mode)
-- 6. RLS multi-tenant complet
-- =====================================================

-- =====================================================
-- 1. ADAPTER TABLE ai_quotes
-- =====================================================

-- Ajouter colonnes manquantes à ai_quotes
DO $$
BEGIN
  -- company_id (multi-tenant)
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

  -- tva_rate (taux TVA personnalisable)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'tva_rate'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN tva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20 CHECK (tva_rate >= 0 AND tva_rate <= 1);
  END IF;

  -- Totaux calculés (stockés pour performance)
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

  -- currency
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN currency TEXT DEFAULT 'EUR';
  END IF;

  -- client_id (lien vers clients)
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
END $$;

-- =====================================================
-- 2. CRÉER TABLE quote_lines (lignes détaillées)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.ai_quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, -- Ordre d'affichage
  label TEXT NOT NULL, -- Nom de la ligne
  description TEXT, -- Description détaillée
  category TEXT CHECK (category IN ('labor', 'material', 'service', 'other')), -- Catégorie
  unit TEXT, -- Unité (m2, ml, h, u, forfait)
  quantity NUMERIC(10,2), -- Quantité
  unit_price_ht NUMERIC(12,2), -- Prix unitaire HT
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0, -- Total ligne HT (calculé + stocké)
  tva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20, -- Taux TVA (copie du devis, modifiable par ligne)
  total_tva NUMERIC(12,2) DEFAULT 0, -- Montant TVA
  total_ttc NUMERIC(12,2) DEFAULT 0, -- Total TTC
  price_source TEXT CHECK (price_source IN ('manual', 'library', 'market_estimate', 'ai_estimate')), -- Source du prix
  metadata JSONB DEFAULT '{}'::jsonb, -- Détails IA, estimations, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id ON public.quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_company_id ON public.quote_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_position ON public.quote_lines(quote_id, position);

-- =====================================================
-- 3. CRÉER TABLE quote_line_library (bibliothèque)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_line_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- Nom de la ligne
  label_normalized TEXT NOT NULL, -- Version normalisée pour déduplication
  default_unit TEXT, -- Unité par défaut
  default_unit_price_ht NUMERIC(12,2), -- Prix unitaire HT par défaut
  default_category TEXT CHECK (default_category IN ('labor', 'material', 'service', 'other')), -- Catégorie par défaut
  times_used INTEGER DEFAULT 0, -- Nombre d'utilisations
  last_used_at TIMESTAMP WITH TIME ZONE, -- Dernière utilisation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, label_normalized) -- Déduplication par company + label normalisé
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_quote_line_library_company_id ON public.quote_line_library(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_library_label_normalized ON public.quote_line_library(company_id, label_normalized);
CREATE INDEX IF NOT EXISTS idx_quote_line_library_times_used ON public.quote_line_library(company_id, times_used DESC);

-- =====================================================
-- 4. CRÉER TABLE materials_price_catalog (référentiel)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.materials_price_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL = global
  material_key TEXT NOT NULL, -- Clé normalisée (ex: "carrelage", "placo", "laine_verre")
  material_name TEXT NOT NULL, -- Nom lisible
  unit TEXT NOT NULL, -- Unité (m2, u, kg, ml)
  avg_unit_price_ht NUMERIC(12,2) NOT NULL, -- Prix moyen HT
  min_unit_price_ht NUMERIC(12,2), -- Prix min HT
  max_unit_price_ht NUMERIC(12,2), -- Prix max HT
  source TEXT DEFAULT 'market' CHECK (source IN ('market', 'supplier', 'manual')), -- Source
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, material_key) -- Déduplication par company + material_key
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_materials_price_catalog_company_id ON public.materials_price_catalog(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_price_catalog_material_key ON public.materials_price_catalog(company_id, material_key);
CREATE INDEX IF NOT EXISTS idx_materials_price_catalog_global ON public.materials_price_catalog(material_key) WHERE company_id IS NULL;

-- =====================================================
-- 5. ADAPTER company_settings (préférences)
-- =====================================================

-- Vérifier si company_settings existe, sinon créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings'
  ) THEN
    CREATE TABLE public.company_settings (
      company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
      default_quote_tva_rate NUMERIC(5,4) DEFAULT 0.20 CHECK (default_quote_tva_rate >= 0 AND default_quote_tva_rate <= 1),
      default_quote_mode TEXT DEFAULT 'simple' CHECK (default_quote_mode IN ('simple', 'detailed')),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ELSE
    -- Ajouter colonnes si table existe déjà
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_settings' 
      AND column_name = 'default_quote_tva_rate'
    ) THEN
      ALTER TABLE public.company_settings 
      ADD COLUMN default_quote_tva_rate NUMERIC(5,4) DEFAULT 0.20 CHECK (default_quote_tva_rate >= 0 AND default_quote_tva_rate <= 1);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_settings' 
      AND column_name = 'default_quote_mode'
    ) THEN
      ALTER TABLE public.company_settings 
      ADD COLUMN default_quote_mode TEXT DEFAULT 'simple' CHECK (default_quote_mode IN ('simple', 'detailed'));
    END IF;
  END IF;
END $$;

-- =====================================================
-- 6. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour normaliser un label (déduplication)
CREATE OR REPLACE FUNCTION public.normalize_label(input_label TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(regexp_replace(input_label, '\s+', ' ', 'g')));
END;
$$;

-- Fonction pour calculer les totaux d'une ligne
CREATE OR REPLACE FUNCTION public.compute_line_totals(
  p_quantity NUMERIC,
  p_unit_price_ht NUMERIC,
  p_tva_rate NUMERIC
)
RETURNS TABLE(
  total_ht NUMERIC,
  total_tva NUMERIC,
  total_ttc NUMERIC
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_total_ht NUMERIC;
  v_total_tva NUMERIC;
  v_total_ttc NUMERIC;
BEGIN
  -- Calcul total HT
  v_total_ht := COALESCE(p_quantity, 0) * COALESCE(p_unit_price_ht, 0);
  v_total_ht := ROUND(v_total_ht, 2);

  -- Calcul TVA
  v_total_tva := v_total_ht * COALESCE(p_tva_rate, 0);
  v_total_tva := ROUND(v_total_tva, 2);

  -- Calcul TTC
  v_total_ttc := v_total_ht + v_total_tva;
  v_total_ttc := ROUND(v_total_ttc, 2);

  RETURN QUERY SELECT v_total_ht, v_total_tva, v_total_ttc;
END;
$$;

-- Trigger pour calculer automatiquement les totaux d'une ligne
CREATE OR REPLACE FUNCTION public.update_quote_line_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_totals RECORD;
BEGIN
  -- Calculer les totaux
  SELECT * INTO v_totals
  FROM public.compute_line_totals(
    NEW.quantity,
    NEW.unit_price_ht,
    NEW.tva_rate
  );

  -- Mettre à jour les champs
  NEW.total_ht := v_totals.total_ht;
  NEW.total_tva := v_totals.total_tva;
  NEW.total_ttc := v_totals.total_ttc;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_quote_line_totals ON public.quote_lines;
CREATE TRIGGER trigger_update_quote_line_totals
  BEFORE INSERT OR UPDATE OF quantity, unit_price_ht, tva_rate
  ON public.quote_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_line_totals();

-- Fonction pour recalculer les totaux d'un devis
CREATE OR REPLACE FUNCTION public.recompute_quote_totals(p_quote_id UUID)
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
BEGIN
  -- Récupérer le taux TVA du devis
  SELECT tva_rate INTO v_tva_rate
  FROM public.ai_quotes
  WHERE id = p_quote_id;

  -- Calculer les totaux depuis les lignes
  SELECT 
    COALESCE(SUM(total_ht), 0),
    COALESCE(SUM(total_tva), 0),
    COALESCE(SUM(total_ttc), 0)
  INTO v_subtotal_ht, v_total_tva, v_total_ttc
  FROM public.quote_lines
  WHERE quote_id = p_quote_id;

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
    updated_at = now()
  WHERE id = p_quote_id;
END;
$$;

-- Trigger pour recalculer les totaux du devis quand une ligne change
CREATE OR REPLACE FUNCTION public.trigger_recompute_quote_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recompute_quote_totals(COALESCE(NEW.quote_id, OLD.quote_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_recompute_quote_on_line_change ON public.quote_lines;
CREATE TRIGGER trigger_recompute_quote_on_line_change
  AFTER INSERT OR UPDATE OR DELETE
  ON public.quote_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recompute_quote_totals();

-- =====================================================
-- 7. RLS (Row Level Security) - Multi-tenant
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_price_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour vérifier appartenance company (évite récursion)
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

-- RLS materials_price_catalog
DROP POLICY IF EXISTS "Users can view materials_price_catalog" ON public.materials_price_catalog;
CREATE POLICY "Users can view materials_price_catalog"
  ON public.materials_price_catalog FOR SELECT
  USING (
    company_id IS NULL -- Global
    OR public.is_company_member(auth.uid(), company_id) -- Company spécifique
  );

DROP POLICY IF EXISTS "Users can manage materials_price_catalog of their companies" ON public.materials_price_catalog;
CREATE POLICY "Users can manage materials_price_catalog of their companies"
  ON public.materials_price_catalog FOR ALL
  USING (
    company_id IS NOT NULL 
    AND public.is_company_member(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL 
    AND public.is_company_member(auth.uid(), company_id)
  );

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

-- =====================================================
-- 8. SEED INITIAL - Prix matériaux de base (global)
-- =====================================================

-- Insérer quelques prix de référence globaux (si pas déjà présents)
INSERT INTO public.materials_price_catalog (company_id, material_key, material_name, unit, avg_unit_price_ht, source)
VALUES
  (NULL, 'carrelage', 'Carrelage standard', 'm2', 25.00, 'market'),
  (NULL, 'parquet', 'Parquet massif', 'm2', 45.00, 'market'),
  (NULL, 'placo', 'Plaque de plâtre', 'm2', 8.50, 'market'),
  (NULL, 'laine_verre', 'Laine de verre', 'm2', 12.00, 'market'),
  (NULL, 'laine_roche', 'Laine de roche', 'm2', 15.00, 'market'),
  (NULL, 'peinture', 'Peinture acrylique', 'm2', 5.00, 'market'),
  (NULL, 'enduit', 'Enduit de façade', 'm2', 12.00, 'market'),
  (NULL, 'tuile', 'Tuile terre cuite', 'm2', 35.00, 'market'),
  (NULL, 'charpente_bois', 'Charpente bois', 'm2', 80.00, 'market'),
  (NULL, 'isolation_combl', 'Isolation combles', 'm2', 20.00, 'market')
ON CONFLICT (company_id, material_key) DO NOTHING;

-- =====================================================
-- 9. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ REFONTE DEVIS PRO - MIGRATION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées/modifiées :';
  RAISE NOTICE '  ✅ ai_quotes (mode, tva_rate, totaux, company_id)';
  RAISE NOTICE '  ✅ quote_lines (lignes détaillées)';
  RAISE NOTICE '  ✅ quote_line_library (bibliothèque)';
  RAISE NOTICE '  ✅ materials_price_catalog (référentiel prix)';
  RAISE NOTICE '  ✅ company_settings (préférences)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées :';
  RAISE NOTICE '  ✅ normalize_label()';
  RAISE NOTICE '  ✅ compute_line_totals()';
  RAISE NOTICE '  ✅ recompute_quote_totals()';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers créés :';
  RAISE NOTICE '  ✅ Calcul automatique totaux lignes';
  RAISE NOTICE '  ✅ Recalcul automatique totaux devis';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS activé avec policies multi-tenant';
  RAISE NOTICE '========================================';
END $$;
