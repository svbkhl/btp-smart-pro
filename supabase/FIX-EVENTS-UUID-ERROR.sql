-- ============================================================================
-- 🔥 FIX : Erreur "invalid input syntax for type uuid: 'events'"
-- ============================================================================
-- Description: Corrige le problème où "events" est utilisé comme UUID
-- Date: 2026-01-13
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Nettoyer les données corrompues
-- ============================================================================

-- Supprimer les événements avec company_id invalide
DELETE FROM public.events
WHERE company_id::text = 'events'
   OR user_id::text = 'events'
   OR project_id::text = 'events'
   OR NOT (company_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- ============================================================================
-- ÉTAPE 2: Vérifier que google_event_id existe et est de type TEXT
-- ============================================================================

DO $$
BEGIN
  -- Ajouter google_event_id si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_event_id TEXT;
    RAISE NOTICE '✅ Colonne google_event_id ajoutée à events';
  ELSE
    RAISE NOTICE '✅ Colonne google_event_id existe déjà';
  END IF;

  -- Ajouter synced_with_google si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'synced_with_google'
  ) THEN
    ALTER TABLE public.events ADD COLUMN synced_with_google BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne synced_with_google ajoutée à events';
  ELSE
    RAISE NOTICE '✅ Colonne synced_with_google existe déjà';
  END IF;

  -- Ajouter google_sync_error si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_sync_error'
  ) THEN
    ALTER TABLE public.events ADD COLUMN google_sync_error TEXT;
    RAISE NOTICE '✅ Colonne google_sync_error ajoutée à events';
  ELSE
    RAISE NOTICE '✅ Colonne google_sync_error existe déjà';
  END IF;
END $$;

-- Index pour google_event_id
CREATE INDEX IF NOT EXISTS idx_events_google_event_id 
ON public.events(google_event_id) 
WHERE google_event_id IS NOT NULL;

-- ============================================================================
-- ÉTAPE 3: Fonction de validation UUID stricte (si n'existe pas)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_uuid_strict(uuid_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  invalid_values TEXT[] := ARRAY['events', 'calendar', 'event', 'table', 'null', 'undefined', ''];
BEGIN
  -- Vérifier que c'est une string non vide
  IF uuid_text IS NULL OR uuid_text = '' THEN
    RETURN false;
  END IF;
  
  -- Vérifier qu'il n'est pas dans la liste des valeurs invalides
  IF LOWER(uuid_text) = ANY(invalid_values) THEN
    RETURN false;
  END IF;
  
  -- Vérifier le format UUID
  RETURN uuid_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
END;
$$;

-- ============================================================================
-- ÉTAPE 4: Trigger de validation avant INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_event_uuid_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Valider user_id
  IF NOT public.is_valid_uuid_strict(NEW.user_id::TEXT) THEN
    RAISE EXCEPTION 'user_id invalide: "%" (doit être un UUID valide, pas "events" ou autre valeur invalide)', NEW.user_id;
  END IF;
  
  -- Valider company_id
  IF NEW.company_id IS NOT NULL AND NOT public.is_valid_uuid_strict(NEW.company_id::TEXT) THEN
    RAISE EXCEPTION 'company_id invalide: "%" (doit être un UUID valide, pas "events" ou autre valeur invalide)', NEW.company_id;
  END IF;
  
  -- Valider project_id si défini
  IF NEW.project_id IS NOT NULL AND NOT public.is_valid_uuid_strict(NEW.project_id::TEXT) THEN
    RAISE EXCEPTION 'project_id invalide: "%" (doit être un UUID valide ou NULL)', NEW.project_id;
  END IF;
  
  -- S'assurer que google_event_id est bien TEXT (pas UUID)
  -- google_event_id peut être n'importe quelle string de Google Calendar
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS validate_event_uuid_fields_trigger ON public.events;

-- Créer le trigger
CREATE TRIGGER validate_event_uuid_fields_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_uuid_fields();

-- ============================================================================
-- ÉTAPE 5: Vérifier la structure de la table
-- ============================================================================

DO $$
DECLARE
  has_company_id BOOLEAN;
  has_google_event_id BOOLEAN;
BEGIN
  -- Vérifier company_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'company_id'
  ) INTO has_company_id;
  
  IF NOT has_company_id THEN
    ALTER TABLE public.events ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Colonne company_id ajoutée à events';
  ELSE
    RAISE NOTICE '✅ Colonne company_id existe déjà';
  END IF;
  
  -- Vérifier google_event_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'google_event_id'
  ) INTO has_google_event_id;
  
  IF NOT has_google_event_id THEN
    ALTER TABLE public.events ADD COLUMN google_event_id TEXT;
    RAISE NOTICE '✅ Colonne google_event_id ajoutée à events';
  ELSE
    RAISE NOTICE '✅ Colonne google_event_id existe déjà';
  END IF;
END $$;

-- ============================================================================
-- RAPPORT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX EVENTS UUID ERROR TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Données corrompues nettoyées';
  RAISE NOTICE '✅ Colonnes google_event_id, synced_with_google, google_sync_error vérifiées';
  RAISE NOTICE '✅ Fonction is_valid_uuid_strict() créée/mise à jour';
  RAISE NOTICE '✅ Trigger validate_event_uuid_fields() créé';
  RAISE NOTICE '✅ Structure de la table vérifiée';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 "events" ne peut plus être utilisé comme UUID';
  RAISE NOTICE '🔒 Séparation claire entre id (UUID) et google_event_id (TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
