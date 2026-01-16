-- =====================================================
-- REFONTE DEVIS : SECTIONS + TVA 293B
-- =====================================================
-- Migration pour :
-- 1. Créer quote_sections (sections par corps de métier)
-- 2. Adapter quote_lines (ajouter section_id)
-- 3. Ajouter tva_non_applicable_293b à ai_quotes
-- 4. Créer quote_section_library (bibliothèque sections)
-- 5. Adapter quote_line_library (ajouter unit dans UNIQUE)
-- 6. Adapter company_settings (tva_293b)
-- 7. RLS complet
-- =====================================================

-- =====================================================
-- 1. CRÉER TABLE quote_sections
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.ai_quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, -- Ordre d'affichage
  title TEXT NOT NULL, -- Titre de la section (ex: "Plâtrerie et isolation")
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_quote_sections_quote_id ON public.quote_sections(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_sections_company_id ON public.quote_sections(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_sections_position ON public.quote_sections(quote_id, position);

-- =====================================================
-- 2. ADAPTER quote_lines (ajouter section_id)
-- =====================================================

DO $$
BEGIN
  -- Ajouter section_id à quote_lines
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

  -- S'assurer que quantity et unit_price_ht sont NOT NULL (obligatoires)
  -- Mais on ne peut pas changer en NOT NULL si des lignes existent avec NULL
  -- On laisse nullable pour compatibilité, mais on valide en application
END $$;

-- =====================================================
-- 3. ADAPTER ai_quotes (ajouter tva_non_applicable_293b)
-- =====================================================

DO $$
BEGIN
  -- Ajouter tva_non_applicable_293b
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'tva_non_applicable_293b'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN tva_non_applicable_293b BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- 4. CRÉER TABLE quote_section_library (bibliothèque sections)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_section_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- Titre de la section
  title_normalized TEXT NOT NULL, -- Version normalisée pour déduplication
  times_used INTEGER DEFAULT 0, -- Nombre d'utilisations
  last_used_at TIMESTAMP WITH TIME ZONE, -- Dernière utilisation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, title_normalized) -- Déduplication par company + title normalisé
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_quote_section_library_company_id ON public.quote_section_library(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_section_library_title_normalized ON public.quote_section_library(company_id, title_normalized);
CREATE INDEX IF NOT EXISTS idx_quote_section_library_times_used ON public.quote_section_library(company_id, times_used DESC);

-- =====================================================
-- 5. ADAPTER quote_line_library (ajouter unit dans UNIQUE)
-- =====================================================

-- Supprimer l'ancienne contrainte UNIQUE si elle existe
DO $$
BEGIN
  -- Vérifier si la contrainte existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_line_library_company_id_label_normalized_key'
    AND conrelid = 'public.quote_line_library'::regclass
  ) THEN
    ALTER TABLE public.quote_line_library 
    DROP CONSTRAINT quote_line_library_company_id_label_normalized_key;
  END IF;
END $$;

-- Créer nouvelle contrainte UNIQUE avec unit
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

-- =====================================================
-- 6. ADAPTER company_settings (ajouter tva_293b)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'default_tva_293b'
  ) THEN
    ALTER TABLE public.company_settings 
    ADD COLUMN default_tva_293b BOOLEAN DEFAULT false;
  END IF;

  -- Renommer default_quote_tva_rate en default_tva_rate si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'default_quote_tva_rate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'default_tva_rate'
  ) THEN
    ALTER TABLE public.company_settings 
    RENAME COLUMN default_quote_tva_rate TO default_tva_rate;
  END IF;
END $$;

-- =====================================================
-- 7. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour normaliser un titre de section
CREATE OR REPLACE FUNCTION public.normalize_section_title(input_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(regexp_replace(input_title, '\s+', ' ', 'g')));
END;
$$;

-- Fonction pour recalculer les totaux avec gestion 293B
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
  SELECT tva_rate, tva_non_applicable_293b INTO v_tva_rate, v_tva_293b
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
    tva_rate = v_tva_rate, -- Forcer à 0 si 293B
    updated_at = now()
  WHERE id = p_quote_id;
END;
$$;

-- Trigger pour recalculer les totaux quand 293B change
CREATE OR REPLACE FUNCTION public.trigger_recompute_quote_on_293b_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si tva_non_applicable_293b change, recalculer
  IF (OLD.tva_non_applicable_293b IS DISTINCT FROM NEW.tva_non_applicable_293b) OR
     (OLD.tva_rate IS DISTINCT FROM NEW.tva_rate) THEN
    PERFORM public.recompute_quote_totals_with_293b(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recompute_quote_on_293b_change ON public.ai_quotes;
CREATE TRIGGER trigger_recompute_quote_on_293b_change
  AFTER UPDATE OF tva_non_applicable_293b, tva_rate
  ON public.ai_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recompute_quote_on_293b_change();

-- =====================================================
-- 8. RLS (Row Level Security) - Multi-tenant
-- =====================================================

-- Activer RLS sur quote_sections
ALTER TABLE public.quote_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_section_library ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- 9. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SECTIONS + TVA 293B - MIGRATION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées/modifiées :';
  RAISE NOTICE '  ✅ quote_sections (sections par corps de métier)';
  RAISE NOTICE '  ✅ quote_lines (ajout section_id)';
  RAISE NOTICE '  ✅ ai_quotes (ajout tva_non_applicable_293b)';
  RAISE NOTICE '  ✅ quote_section_library (bibliothèque sections)';
  RAISE NOTICE '  ✅ quote_line_library (UNIQUE avec unit)';
  RAISE NOTICE '  ✅ company_settings (ajout default_tva_293b)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées :';
  RAISE NOTICE '  ✅ normalize_section_title()';
  RAISE NOTICE '  ✅ recompute_quote_totals_with_293b()';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers créés :';
  RAISE NOTICE '  ✅ Recalcul automatique totaux si 293B change';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS activé avec policies multi-tenant';
  RAISE NOTICE '========================================';
END $$;
