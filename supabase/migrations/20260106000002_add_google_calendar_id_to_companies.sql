-- ============================================================================
-- 🔗 AJOUTER google_calendar_id À companies
-- ============================================================================
-- Description: Ajoute la colonne google_calendar_id à la table companies
-- pour stocker l'ID du calendrier Google créé pour l'entreprise
-- ============================================================================

-- Ajouter la colonne google_calendar_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'google_calendar_id'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN google_calendar_id TEXT;
    RAISE NOTICE '✅ Colonne google_calendar_id ajoutée à companies';
  ELSE
    RAISE NOTICE '✅ Colonne google_calendar_id existe déjà';
  END IF;
END $$;

-- Commentaire
COMMENT ON COLUMN public.companies.google_calendar_id IS 'ID du calendrier Google créé pour l''entreprise (ex: "abc123@group.calendar.google.com")';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_companies_google_calendar_id 
ON public.companies(google_calendar_id) 
WHERE google_calendar_id IS NOT NULL;

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ COLONNE google_calendar_id AJOUTÉE À companies !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Colonne google_calendar_id créée';
  RAISE NOTICE '✅ Index créé pour performance';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;


