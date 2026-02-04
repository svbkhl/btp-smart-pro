-- ============================================================================
-- ONBOARDING: Marquer la première connexion comme complétée
-- ============================================================================
-- Ajoute onboarding_completed à user_settings pour ne montrer le guide qu'une seule fois.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.user_settings
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Colonne onboarding_completed ajoutée à user_settings';
  END IF;
END $$;

COMMENT ON COLUMN public.user_settings.onboarding_completed IS 'True après que l''utilisateur a terminé ou ignoré le guide de première connexion';
