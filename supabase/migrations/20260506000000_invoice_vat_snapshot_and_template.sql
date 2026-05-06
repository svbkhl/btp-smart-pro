-- =====================================================================
-- 2026-05-06 — Bug #1 (TVA franchise 293 B) + refonte design éditorial
-- =====================================================================
-- Snapshot du régime TVA + mention légale au moment de l'émission de la
-- facture. Une facture émise est immuable côté fiscalité — on ne recalcule
-- jamais à l'affichage.
--
-- Ajoute aussi le support de la refonte design v2 :
--   - user_settings.invoice_template_version
--   - user_settings.brand_color
-- + champs pour conformité légale (APE, capital social, date prestation).
-- =====================================================================

-- 1. user_settings : régime TVA courant + paramètres template + champs légaux
DO $$
BEGIN
  -- vat_regime : STANDARD / FRANCHISE_293B / AUTOLIQUIDATION_BTP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'vat_regime'
  ) THEN
    ALTER TABLE public.user_settings
      ADD COLUMN vat_regime TEXT NOT NULL DEFAULT 'STANDARD'
        CHECK (vat_regime IN ('STANDARD','FRANCHISE_293B','AUTOLIQUIDATION_BTP'));
    RAISE NOTICE '✅ user_settings.vat_regime ajouté';
  ELSE
    RAISE NOTICE 'ℹ️ user_settings.vat_regime existe déjà';
  END IF;

  -- invoice_template_version : v1 (legacy) / v2-editorial (nouveau)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'invoice_template_version'
  ) THEN
    ALTER TABLE public.user_settings
      ADD COLUMN invoice_template_version TEXT NOT NULL DEFAULT 'v1'
        CHECK (invoice_template_version IN ('v1','v2-editorial'));
    RAISE NOTICE '✅ user_settings.invoice_template_version ajouté';
  END IF;

  -- brand_color : couleur d'accent pour le template v2 (HEX)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'brand_color'
  ) THEN
    ALTER TABLE public.user_settings
      ADD COLUMN brand_color TEXT NULL
        CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$');
    RAISE NOTICE '✅ user_settings.brand_color ajouté';
  END IF;

  -- ape_code : code APE (4 chiffres + 1 lettre, ex. 4322A)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'ape_code'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN ape_code TEXT NULL;
    RAISE NOTICE '✅ user_settings.ape_code ajouté';
  END IF;

  -- capital_social : capital social en euros (NUMERIC)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'capital_social'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN capital_social NUMERIC NULL;
    RAISE NOTICE '✅ user_settings.capital_social ajouté';
  END IF;
END $$;

-- 2. invoices : snapshot TVA + date prestation
DO $$
BEGIN
  -- vat_regime snapshotté au moment de l'émission
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'vat_regime'
  ) THEN
    ALTER TABLE public.invoices
      ADD COLUMN vat_regime TEXT NULL
        CHECK (vat_regime IS NULL OR vat_regime IN ('STANDARD','FRANCHISE_293B','AUTOLIQUIDATION_BTP'));
    RAISE NOTICE '✅ invoices.vat_regime ajouté';
  END IF;

  -- vat_rate_snapshot : taux décimal effectif au moment T (ex. 0.20)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'vat_rate_snapshot'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN vat_rate_snapshot NUMERIC NULL;
    RAISE NOTICE '✅ invoices.vat_rate_snapshot ajouté';
  END IF;

  -- vat_legal_mention : mention légale figée à imprimer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'vat_legal_mention'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN vat_legal_mention TEXT NULL;
    RAISE NOTICE '✅ invoices.vat_legal_mention ajouté';
  END IF;

  -- service_date : date de livraison/prestation (≠ date d'émission, mention obligatoire)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'service_date'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN service_date DATE NULL;
    RAISE NOTICE '✅ invoices.service_date ajouté';
  END IF;
END $$;

-- 3. Backfill conservateur des factures déjà émises.
-- Ne JAMAIS recalculer rétroactivement la TVA — on déduit le régime depuis
-- les valeurs existantes :
--   tva = 0 ET total_ht ≈ total_ttc → FRANCHISE_293B (probable)
--   tva > 0                         → STANDARD
-- Le snapshot est figé : si un audit fiscal est demandé, ce sont ces valeurs
-- qui font foi.
UPDATE public.invoices
SET
  vat_regime = CASE
    WHEN vat_regime IS NOT NULL THEN vat_regime
    WHEN COALESCE(tva, 0) = 0 AND COALESCE(total_ht, 0) = COALESCE(total_ttc, total_ht, 0)
      THEN 'FRANCHISE_293B'
    ELSE 'STANDARD'
  END,
  vat_rate_snapshot = CASE
    WHEN vat_rate_snapshot IS NOT NULL THEN vat_rate_snapshot
    WHEN COALESCE(total_ht, 0) > 0 AND COALESCE(tva, 0) > 0
      THEN ROUND(tva::NUMERIC / total_ht::NUMERIC, 4)
    ELSE 0
  END,
  vat_legal_mention = CASE
    WHEN vat_legal_mention IS NOT NULL THEN vat_legal_mention
    WHEN COALESCE(tva, 0) = 0 AND COALESCE(total_ht, 0) = COALESCE(total_ttc, total_ht, 0)
      THEN 'TVA non applicable, art. 293 B du CGI.'
    ELSE NULL
  END
WHERE vat_regime IS NULL OR vat_rate_snapshot IS NULL;

-- 4. Index utile pour les rapports fiscaux par régime
CREATE INDEX IF NOT EXISTS idx_invoices_vat_regime ON public.invoices(vat_regime);

-- =====================================================================
-- FIN DE MIGRATION
-- =====================================================================
