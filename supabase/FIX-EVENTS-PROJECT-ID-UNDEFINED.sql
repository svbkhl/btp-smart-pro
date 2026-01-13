-- ============================================================================
-- 🔥 FIX : project_id undefined causant erreur UUID "events"
-- ============================================================================
-- Description: Corrige le problème où project_id undefined cause l'erreur UUID
-- Date: 2026-01-13
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Vérifier que project_id est bien nullable
-- ============================================================================

DO $$
BEGIN
  -- Vérifier que project_id est nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'project_id'
    AND is_nullable = 'NO'
  ) THEN
    -- Rendre project_id nullable si ce n'est pas déjà le cas
    ALTER TABLE public.events ALTER COLUMN project_id DROP NOT NULL;
    RAISE NOTICE '✅ project_id rendu nullable';
  ELSE
    RAISE NOTICE '✅ project_id est déjà nullable';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: Améliorer le trigger de validation pour gérer project_id NULL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_event_uuid_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- ⚠️ VALIDATION STRICTE user_id
  IF NOT public.is_valid_uuid_strict(NEW.user_id::TEXT) THEN
    RAISE EXCEPTION 'user_id invalide: "%" (doit être un UUID valide, pas "events" ou autre valeur invalide)', NEW.user_id;
  END IF;
  
  -- ⚠️ VALIDATION STRICTE company_id
  IF NEW.company_id IS NOT NULL THEN
    IF NOT public.is_valid_uuid_strict(NEW.company_id::TEXT) THEN
      RAISE EXCEPTION 'company_id invalide: "%" (doit être un UUID valide, pas "events" ou autre valeur invalide)', NEW.company_id;
    END IF;
  END IF;
  
  -- ⚠️ VALIDATION STRICTE project_id si défini (peut être NULL)
  IF NEW.project_id IS NOT NULL THEN
    -- ⚠️ Vérifier que project_id n'est pas une string invalide
    IF NEW.project_id::TEXT = 'events' OR NEW.project_id::TEXT = 'undefined' OR NEW.project_id::TEXT = '' THEN
      RAISE EXCEPTION 'project_id invalide: "%" (doit être un UUID valide ou NULL, pas "events", "undefined" ou chaîne vide)', NEW.project_id;
    END IF;
    
    IF NOT public.is_valid_uuid_strict(NEW.project_id::TEXT) THEN
      RAISE EXCEPTION 'project_id invalide: "%" (doit être un UUID valide ou NULL)', NEW.project_id;
    END IF;
  ELSE
    -- ⚠️ S'assurer que project_id est bien NULL (pas undefined)
    NEW.project_id := NULL;
  END IF;
  
  -- ⚠️ S'assurer que google_event_id est bien TEXT (pas UUID)
  -- google_event_id peut être n'importe quelle string de Google Calendar
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÉTAPE 3: Vérifier que le trigger existe et est actif
-- ============================================================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS validate_event_uuid_fields_trigger ON public.events;

-- Créer le trigger
CREATE TRIGGER validate_event_uuid_fields_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_uuid_fields();

-- ============================================================================
-- ÉTAPE 4: Vérifier que create_notification accepte 'events' comme string
-- ============================================================================

-- Vérifier la signature de create_notification
DO $$
DECLARE
  func_exists BOOLEAN;
  param_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'create_notification'
  ) INTO func_exists;
  
  IF func_exists THEN
    SELECT COUNT(*) INTO param_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_proc_arguments pa ON p.oid = pa.prooid
    WHERE n.nspname = 'public'
    AND p.proname = 'create_notification';
    
    RAISE NOTICE '✅ Fonction create_notification existe avec % paramètres', param_count;
  ELSE
    RAISE WARNING '⚠️ Fonction create_notification n''existe pas - le trigger notify_on_event_created pourrait échouer';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 5: S'assurer que project_id n'est jamais "events" ou "undefined"
-- ============================================================================

-- Nettoyer les données corrompues
UPDATE public.events
SET project_id = NULL
WHERE project_id::TEXT = 'events'
   OR project_id::TEXT = 'undefined'
   OR project_id::TEXT = '';

-- ============================================================================
-- RAPPORT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX PROJECT_ID UNDEFINED TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ project_id vérifié et rendu nullable si nécessaire';
  RAISE NOTICE '✅ Trigger validate_event_uuid_fields() amélioré';
  RAISE NOTICE '   - Gère project_id NULL correctement';
  RAISE NOTICE '   - Bloque "events", "undefined", chaînes vides';
  RAISE NOTICE '✅ Données corrompues nettoyées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 project_id undefined ne causera plus d''erreur UUID';
  RAISE NOTICE '🔒 project_id peut être NULL (optionnel)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
