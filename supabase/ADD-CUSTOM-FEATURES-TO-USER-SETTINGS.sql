-- ============================================
-- AJOUT DE CHAMPS PERSONNALISABLES DANS user_settings
-- ============================================
-- Ce script ajoute des champs pour permettre la personnalisation
-- par entreprise (feature flags, styles, etc.)
-- ============================================

-- Ajouter les colonnes pour les fonctionnalités personnalisées
DO $$ 
BEGIN
  -- Feature flags personnalisés (JSONB pour flexibilité)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'custom_features'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN custom_features JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Colonne custom_features ajoutée';
  END IF;
  
  -- Couleurs personnalisées
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'custom_primary_color'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN custom_primary_color TEXT;
    RAISE NOTICE '✅ Colonne custom_primary_color ajoutée';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'custom_secondary_color'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN custom_secondary_color TEXT;
    RAISE NOTICE '✅ Colonne custom_secondary_color ajoutée';
  END IF;
  
  -- Paramètres personnalisés (JSONB pour stocker n'importe quel paramètre)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'custom_settings'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN custom_settings JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Colonne custom_settings ajoutée';
  END IF;
  
  -- Notes admin (pour que l'admin puisse noter des infos sur cette entreprise)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN admin_notes TEXT;
    RAISE NOTICE '✅ Colonne admin_notes ajoutée';
  END IF;
  
  -- Statut personnalisé (actif, suspendu, en test, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'custom_status'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN custom_status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Colonne custom_status ajoutée';
  END IF;
END $$;

-- Créer un index sur custom_features pour les recherches
CREATE INDEX IF NOT EXISTS idx_user_settings_custom_features 
ON public.user_settings USING GIN (custom_features);

-- Créer un index sur custom_settings pour les recherches
CREATE INDEX IF NOT EXISTS idx_user_settings_custom_settings 
ON public.user_settings USING GIN (custom_settings);

-- Commentaires pour documentation
COMMENT ON COLUMN public.user_settings.custom_features IS 'Fonctionnalités personnalisées activées/désactivées (JSONB: {"feature_name": true/false})';
COMMENT ON COLUMN public.user_settings.custom_primary_color IS 'Couleur primaire personnalisée (hex: #FF5733)';
COMMENT ON COLUMN public.user_settings.custom_secondary_color IS 'Couleur secondaire personnalisée (hex: #33FF57)';
COMMENT ON COLUMN public.user_settings.custom_settings IS 'Paramètres personnalisés libres (JSONB: {"key": "value"})';
COMMENT ON COLUMN public.user_settings.admin_notes IS 'Notes privées de l''administrateur sur cette entreprise';
COMMENT ON COLUMN public.user_settings.custom_status IS 'Statut personnalisé (active, suspended, testing, etc.)';
















