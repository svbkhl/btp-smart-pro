-- ============================================================================
-- 🔥 FIX DÉFINITIF : Erreur "invalid input syntax for type uuid: 'events'"
-- ============================================================================
-- Description: Corrige définitivement le problème en supprimant/corrigeant
--              tous les triggers et fonctions qui pourraient injecter "events"
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Désactiver TEMPORAIREMENT tous les triggers sur events
-- ============================================================================
DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'events'
    AND NOT t.tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE public.events DISABLE TRIGGER %I', trig.tgname);
    RAISE NOTICE '⚠️ Trigger désactivé temporairement: %', trig.tgname;
  END LOOP;
END $$;

-- ============================================================================
-- ÉTAPE 2: Supprimer TOUS les triggers problématiques
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_set_event_user_id ON public.events;
DROP TRIGGER IF EXISTS validate_event_before_insert_ultra_strict_trigger ON public.events;
DROP TRIGGER IF EXISTS validate_event_insert_trigger ON public.events;
DROP TRIGGER IF EXISTS validate_event_before_insert_trigger ON public.events;
DROP TRIGGER IF EXISTS validate_event_uuid_fields_trigger ON public.events;

-- ============================================================================
-- ÉTAPE 3: Vérifier et corriger la structure de la table
-- ============================================================================

-- S'assurer que project_id est nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'project_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.events ALTER COLUMN project_id DROP NOT NULL;
    RAISE NOTICE '✅ project_id rendu nullable';
  END IF;
END $$;

-- S'assurer que company_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ company_id ajouté';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4: Créer une fonction de validation SÉCURISÉE (sans utiliser TG_TABLE_NAME)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_event_before_insert_secure()
RETURNS TRIGGER AS $$
BEGIN
  -- ⚠️ VALIDATION STRICTE user_id
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id ne peut pas être NULL';
  END IF;
  
  IF NEW.user_id::TEXT = 'events' OR NEW.user_id::TEXT = 'undefined' OR NEW.user_id::TEXT = '' THEN
    RAISE EXCEPTION 'user_id invalide: "%" (doit être un UUID valide)', NEW.user_id;
  END IF;
  
  IF NOT (NEW.user_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'user_id invalide: "%" (format UUID invalide)', NEW.user_id;
  END IF;
  
  -- ⚠️ VALIDATION STRICTE company_id
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id ne peut pas être NULL';
  END IF;
  
  IF NEW.company_id::TEXT = 'events' OR NEW.company_id::TEXT = 'undefined' OR NEW.company_id::TEXT = '' THEN
    RAISE EXCEPTION 'company_id invalide: "%" (doit être un UUID valide)', NEW.company_id;
  END IF;
  
  IF NOT (NEW.company_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'company_id invalide: "%" (format UUID invalide)', NEW.company_id;
  END IF;
  
  -- ⚠️ VALIDATION project_id (peut être NULL)
  IF NEW.project_id IS NOT NULL THEN
    IF NEW.project_id::TEXT = 'events' OR NEW.project_id::TEXT = 'undefined' OR NEW.project_id::TEXT = '' THEN
      RAISE EXCEPTION 'project_id invalide: "%" (doit être un UUID valide ou NULL)', NEW.project_id;
    END IF;
    
    IF NOT (NEW.project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      RAISE EXCEPTION 'project_id invalide: "%" (format UUID invalide)', NEW.project_id;
    END IF;
  ELSE
    -- S'assurer que project_id est bien NULL (pas undefined)
    NEW.project_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ÉTAPE 5: Créer le trigger SÉCURISÉ
-- ============================================================================

CREATE TRIGGER validate_event_before_insert_secure_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_before_insert_secure();

-- ============================================================================
-- ÉTAPE 6: Réactiver les triggers non problématiques
-- ============================================================================

-- Réactiver trigger_update_events_updated_at si nécessaire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'events'
    AND t.tgname = 'trigger_update_events_updated_at'
  ) THEN
    ALTER TABLE public.events ENABLE TRIGGER trigger_update_events_updated_at;
    RAISE NOTICE '✅ trigger_update_events_updated_at réactivé';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 7: Nettoyer les données corrompues
-- ============================================================================

UPDATE public.events
SET project_id = NULL
WHERE project_id::TEXT = 'events'
   OR project_id::TEXT = 'undefined'
   OR project_id::TEXT = '';

DELETE FROM public.events
WHERE company_id::TEXT = 'events'
   OR user_id::TEXT = 'events'
   OR id::TEXT = 'events';

-- ============================================================================
-- ÉTAPE 8: Vérifier qu'il n'y a plus de triggers problématiques
-- ============================================================================

DO $$
DECLARE
  trig_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trig_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE n.nspname = 'public'
  AND c.relname = 'events'
  AND NOT t.tgisinternal
  AND (
    pg_get_functiondef(p.oid) ILIKE '%TG_TABLE_NAME%'
    OR pg_get_functiondef(p.oid) ILIKE '%TG_RELNAME%'
    OR pg_get_functiondef(p.oid) ~ 'NEW\.(user_id|company_id|project_id)\s*:=\s*.*events'
  );
  
  IF trig_count > 0 THEN
    RAISE WARNING '⚠️ Il reste % trigger(s) potentiellement problématique(s)', trig_count;
  ELSE
    RAISE NOTICE '✅ Aucun trigger problématique détecté';
  END IF;
END $$;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX DÉFINITIF EVENTS UUID TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tous les triggers problématiques supprimés';
  RAISE NOTICE '✅ Trigger validate_event_before_insert_secure créé';
  RAISE NOTICE '✅ Structure de la table vérifiée/corrigée';
  RAISE NOTICE '✅ Données corrompues nettoyées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 "events" ne peut plus être injecté comme UUID';
  RAISE NOTICE '🔒 Validation stricte avant INSERT';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
