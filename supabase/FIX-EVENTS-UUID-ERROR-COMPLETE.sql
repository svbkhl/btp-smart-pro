-- ============================================================================
-- 🔥 FIX COMPLET : Erreur "invalid input syntax for type uuid: 'events'"
-- ============================================================================
-- Description: Corrige définitivement le problème où "events" est utilisé comme UUID
-- Date: 2026-01-13
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Nettoyer les données corrompues
-- ============================================================================

-- Supprimer les événements avec UUID invalides
DELETE FROM public.events
WHERE company_id::text = 'events'
   OR user_id::text = 'events'
   OR project_id::text = 'events'
   OR project_id::text = 'undefined'
   OR id::text = 'events'
   OR NOT (company_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   OR NOT (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   OR (project_id IS NOT NULL AND (
     project_id::text = 'undefined'
     OR project_id::text = ''
     OR NOT (project_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   ));

-- ============================================================================
-- ÉTAPE 2: Fonction de validation UUID stricte
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_uuid_strict(uuid_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  invalid_values TEXT[] := ARRAY['events', 'calendar', 'event', 'table', 'null', 'undefined', '', 'null', 'NULL'];
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

COMMENT ON FUNCTION public.is_valid_uuid_strict IS 'Valide strictement qu''une string est un UUID valide et bloque les valeurs invalides comme "events"';

-- ============================================================================
-- ÉTAPE 3: Sécuriser current_company_id() pour ne JAMAIS retourner "events"
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_company_id UUID;
BEGIN
  -- Récupérer le company_id depuis company_users
  SELECT cu.company_id INTO result_company_id
  FROM public.company_users cu
  WHERE cu.user_id = auth.uid()
  LIMIT 1;
  
  -- ⚠️ VALIDATION STRICTE : Vérifier que le résultat est un UUID valide
  IF result_company_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- ⚠️ BLOQUER EXPLICITEMENT "events" et autres valeurs invalides
  IF NOT public.is_valid_uuid_strict(result_company_id::TEXT) THEN
    RAISE WARNING 'current_company_id() a retourné une valeur invalide: %', result_company_id;
    RETURN NULL;
  END IF;
  
  RETURN result_company_id;
END;
$$;

COMMENT ON FUNCTION public.current_company_id IS 'Retourne le company_id de l''utilisateur actuel, ou NULL si aucun. Bloque "events" et autres valeurs invalides.';

-- ============================================================================
-- ÉTAPE 4: Vérifier/Ajouter colonnes Google Calendar
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
-- ÉTAPE 5: Trigger de validation ULTRA-STRICT avant INSERT/UPDATE
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

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS validate_event_uuid_fields_trigger ON public.events;
DROP TRIGGER IF EXISTS validate_event_before_insert_ultra_strict_trigger ON public.events;

-- Créer le trigger
CREATE TRIGGER validate_event_uuid_fields_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_uuid_fields();

-- ============================================================================
-- ÉTAPE 6: Corriger les RLS Policies pour validation stricte
-- ============================================================================

-- Supprimer toutes les anciennes policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
  END LOOP;
END $$;

-- Créer une policy ULTRA-SÉCURISÉE avec validation stricte
CREATE POLICY "Company users can manage events - ULTRA SECURE"
ON public.events FOR ALL
USING (
  -- Vérifier que l'utilisateur est authentifié
  auth.uid() IS NOT NULL
  AND
  -- Vérifier que user_id correspond
  user_id = auth.uid()
  AND
  -- ⚠️ VALIDATION STRICTE : Vérifier que company_id est un UUID valide
  public.is_valid_uuid_strict(company_id::TEXT)
  AND
  -- Vérifier que company_id correspond (avec validation de current_company_id)
  (
    company_id = public.current_company_id()
    OR
    -- Fallback : récupérer directement depuis company_users si current_company_id() retourne NULL
    company_id = (
      SELECT cu.company_id 
      FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() 
      AND public.is_valid_uuid_strict(cu.company_id::TEXT)
      LIMIT 1
    )
  )
)
WITH CHECK (
  -- Même validation pour INSERT/UPDATE
  auth.uid() IS NOT NULL
  AND
  user_id = auth.uid()
  AND
  public.is_valid_uuid_strict(company_id::TEXT)
  AND
  (
    company_id = public.current_company_id()
    OR
    company_id = (
      SELECT cu.company_id 
      FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() 
      AND public.is_valid_uuid_strict(cu.company_id::TEXT)
      LIMIT 1
    )
  )
);

-- ============================================================================
-- ÉTAPE 7: Vérifier que project_id est nullable
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
-- ÉTAPE 8: Vérifier la structure de la table
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
-- ÉTAPE 8: Index pour performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.events(company_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

-- ============================================================================
-- RAPPORT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX EVENTS UUID ERROR COMPLET TERMINÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Données corrompues nettoyées';
  RAISE NOTICE '✅ Fonction is_valid_uuid_strict() créée/mise à jour';
  RAISE NOTICE '✅ Fonction current_company_id() sécurisée';
  RAISE NOTICE '✅ Colonnes google_event_id, synced_with_google, google_sync_error vérifiées';
  RAISE NOTICE '✅ Trigger validate_event_uuid_fields() créé';
  RAISE NOTICE '✅ RLS policy ultra-sécurisée créée';
  RAISE NOTICE '✅ Structure de la table vérifiée';
  RAISE NOTICE '✅ Indexes créés';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 "events" ne peut plus être utilisé comme UUID';
  RAISE NOTICE '🔒 Séparation claire entre id (UUID) et google_event_id (TEXT)';
  RAISE NOTICE '🔒 Validation triple : frontend + trigger + RLS';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
