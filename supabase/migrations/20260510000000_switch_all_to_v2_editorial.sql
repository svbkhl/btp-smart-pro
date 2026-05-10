-- =====================================================================
-- 2026-05-10 — Basculer tous les comptes vers le template v2-editorial
-- =====================================================================
-- Le template v2 (noir & blanc éditorial) est maintenant le design par
-- défaut. On met à jour toutes les lignes existantes et on change le
-- DEFAULT de la colonne pour les nouveaux comptes.
-- =====================================================================

-- 1. Mettre à jour tous les comptes existants en v2-editorial
UPDATE public.user_settings
SET invoice_template_version = 'v2-editorial'
WHERE invoice_template_version = 'v1' OR invoice_template_version IS NULL;

-- 2. Changer le DEFAULT pour les nouveaux comptes
ALTER TABLE public.user_settings
  ALTER COLUMN invoice_template_version SET DEFAULT 'v2-editorial';

-- Vérification
DO $$
DECLARE
  v1_count INT;
  v2_count INT;
BEGIN
  SELECT COUNT(*) INTO v1_count FROM public.user_settings WHERE invoice_template_version = 'v1';
  SELECT COUNT(*) INTO v2_count FROM public.user_settings WHERE invoice_template_version = 'v2-editorial';
  RAISE NOTICE '✅ Migration terminée : % compte(s) v1 restant, % compte(s) v2-editorial', v1_count, v2_count;
END $$;
