-- ============================================================================
-- 🔥 FIX ULTRA SÉCURISÉ : Insertion événements
-- ============================================================================
-- Description: Sécurise définitivement l'insertion en bloquant toute valeur
--              invalide comme "events" dans les champs UUID
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FIX 1: Fonction de validation UUID ultra-stricte
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

COMMENT ON FUNCTION public.is_valid_uuid_strict IS 'Valide strictement qu''une string est un UUID valide et bloque les valeurs invalides comme "events"';

-- ============================================================================
-- FIX 2: Trigger de validation ULTRA-STRICT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_event_before_insert_ultra_strict()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
  current_user_id UUID;
BEGIN
  -- Récupérer l'utilisateur actuel
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Vous devez être authentifié pour créer un événement';
  END IF;
  
  -- ⚠️ VALIDATION STRICTE user_id
  IF NOT public.is_valid_uuid_strict(NEW.user_id::TEXT) THEN
    RAISE EXCEPTION 'user_id invalide: "%" (doit être un UUID valide, pas "events" ou autre valeur invalide)', NEW.user_id;
  END IF;
  
  IF NEW.user_id != current_user_id THEN
    RAISE EXCEPTION 'user_id "%" ne correspond pas à l''utilisateur authentifié "%"', NEW.user_id, current_user_id;
  END IF;
  
  -- ⚠️ VALIDATION STRICTE company_id
  IF NOT public.is_valid_uuid_strict(NEW.company_id::TEXT) THEN
    RAISE EXCEPTION 'company_id invalide: "%" (doit être un UUID valide, pas "events" ou autre valeur invalide)', NEW.company_id;
  END IF;
  
  -- Récupérer le company_id de l'utilisateur
  SELECT company_id INTO user_company_id
  FROM public.company_users
  WHERE user_id = current_user_id
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'L''utilisateur n''est associé à aucune entreprise';
  END IF;
  
  -- Vérifier que company_id correspond
  IF NEW.company_id != user_company_id THEN
    RAISE EXCEPTION 'company_id "%" ne correspond pas à l''entreprise de l''utilisateur "%"', NEW.company_id, user_company_id;
  END IF;
  
  -- Si project_id est défini, vérifier qu'il est valide
  IF NEW.project_id IS NOT NULL THEN
    IF NOT public.is_valid_uuid_strict(NEW.project_id::TEXT) THEN
      RAISE EXCEPTION 'project_id invalide: "%" (doit être un UUID valide ou NULL)', NEW.project_id;
    END IF;
    
    -- Vérifier que le projet appartient à la même entreprise
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id
      AND company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Le projet "%" n''existe pas ou n''appartient pas à cette entreprise', NEW.project_id;
    END IF;
  END IF;
  
  -- S'assurer que company_id est bien défini (double sécurité)
  IF NEW.company_id IS NULL THEN
    NEW.company_id := user_company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS validate_event_before_insert_trigger ON public.events;
DROP TRIGGER IF EXISTS validate_event_insert_trigger ON public.events;

-- Créer le trigger ultra-strict
CREATE TRIGGER validate_event_before_insert_ultra_strict_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_before_insert_ultra_strict();

COMMENT ON FUNCTION public.validate_event_before_insert_ultra_strict IS 'Valide ultra-strictement tous les UUID avant insertion et bloque "events" et autres valeurs invalides';

-- ============================================================================
-- FIX 3: RLS Policy ultra-stricte
-- ============================================================================
DO $$
BEGIN
  -- Supprimer l'ancienne policy
  DROP POLICY IF EXISTS "Company users can manage events" ON public.events;
  
  -- Créer une nouvelle policy ultra-stricte
  CREATE POLICY "Company users can manage events"
  ON public.events FOR ALL
  USING (
    -- Vérifier que l'utilisateur est authentifié
    auth.uid() IS NOT NULL
    AND
    -- Vérifier que user_id correspond
    user_id = auth.uid()
    AND
    -- Vérifier que company_id correspond
    company_id = (
      SELECT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  )
  WITH CHECK (
    -- Pour INSERT/UPDATE, vérifier strictement
    auth.uid() IS NOT NULL
    AND
    user_id = auth.uid()
    AND
    company_id = (
      SELECT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
    -- ⚠️ Vérifier que company_id n'est pas "events" ou autre valeur invalide
    AND public.is_valid_uuid_strict(company_id::TEXT)
  );
  
  RAISE NOTICE '✅ RLS policy ultra-stricte créée pour events';
END $$;

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VALIDATION ULTRA-STRICTE ÉVÉNEMENTS !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonction is_valid_uuid_strict() créée';
  RAISE NOTICE '   - Bloque "events", "calendar", "event", etc.';
  RAISE NOTICE '✅ Trigger validate_event_before_insert_ultra_strict() créé';
  RAISE NOTICE '   - Validation user_id = auth.uid()';
  RAISE NOTICE '   - Validation company_id correspond';
  RAISE NOTICE '   - Blocage des valeurs invalides';
  RAISE NOTICE '✅ RLS policy ultra-stricte';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 "events" ne peut plus être injecté comme UUID';
  RAISE NOTICE '🔒 Toutes les valeurs invalides sont bloquées';
  RAISE NOTICE '🔒 Validation triple : frontend + trigger + RLS';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
