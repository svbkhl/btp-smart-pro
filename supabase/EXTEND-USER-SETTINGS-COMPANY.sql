-- Extension de la table user_settings pour inclure les informations complètes de l'entreprise
-- Nécessaire pour la génération automatique de devis et factures

-- Ajouter les colonnes manquantes pour les informations d'entreprise
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS siret TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'France';

-- Commentaires pour documentation
COMMENT ON COLUMN public.user_settings.company_logo_url IS 'URL du logo de l''entreprise (stocké dans Supabase Storage)';
COMMENT ON COLUMN public.user_settings.siret IS 'Numéro SIRET de l''entreprise (14 chiffres)';
COMMENT ON COLUMN public.user_settings.vat_number IS 'Numéro de TVA intracommunautaire (ex: FR12345678901)';
COMMENT ON COLUMN public.user_settings.terms_and_conditions IS 'Conditions générales de vente (texte libre)';
COMMENT ON COLUMN public.user_settings.city IS 'Ville de l''entreprise';
COMMENT ON COLUMN public.user_settings.postal_code IS 'Code postal de l''entreprise';
COMMENT ON COLUMN public.user_settings.country IS 'Pays de l''entreprise (par défaut: France)';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_settings_siret ON public.user_settings(siret) WHERE siret IS NOT NULL;

-- Fonction pour valider le format SIRET (14 chiffres)
CREATE OR REPLACE FUNCTION public.validate_siret(siret_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier que le SIRET contient exactement 14 chiffres
  RETURN siret_value ~ '^[0-9]{14}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour valider le format TVA intracommunautaire
CREATE OR REPLACE FUNCTION public.validate_vat_number(vat_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Format: 2 lettres (code pays) + 2 à 12 caractères alphanumériques
  -- Exemples: FR12345678901, DE123456789, IT12345678901
  RETURN vat_value ~ '^[A-Z]{2}[A-Z0-9]{2,12}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger pour valider SIRET et TVA lors de l'insertion/mise à jour
CREATE OR REPLACE FUNCTION public.validate_company_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Valider SIRET si fourni
  IF NEW.siret IS NOT NULL AND NEW.siret != '' THEN
    IF NOT public.validate_siret(NEW.siret) THEN
      RAISE EXCEPTION 'Le numéro SIRET doit contenir exactement 14 chiffres';
    END IF;
  END IF;

  -- Valider TVA si fournie
  IF NEW.vat_number IS NOT NULL AND NEW.vat_number != '' THEN
    IF NOT public.validate_vat_number(NEW.vat_number) THEN
      RAISE EXCEPTION 'Le numéro de TVA intracommunautaire est invalide. Format attendu: 2 lettres (code pays) + 2 à 12 caractères alphanumériques (ex: FR12345678901)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS validate_company_info_trigger ON public.user_settings;

-- Créer le trigger
CREATE TRIGGER validate_company_info_trigger
BEFORE INSERT OR UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_company_info();

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table user_settings étendue avec succès';
  RAISE NOTICE '   - Colonnes ajoutées: company_logo_url, siret, vat_number, terms_and_conditions, city, postal_code, country';
  RAISE NOTICE '   - Fonctions de validation créées pour SIRET et TVA';
  RAISE NOTICE '   - Trigger de validation configuré';
END $$;

