-- ============================================================================
-- 🔥 FIX ULTIME : Validation complète insertion événements
-- ============================================================================
-- Description: Valide strictement tous les UUID avant insertion
--              Bloque toute valeur invalide (comme "events")
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FIX 1: Fonction de validation UUID stricte
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_valid_uuid(uuid_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Vérifier que c'est une string non vide
  IF uuid_text IS NULL OR uuid_text = '' THEN
    RETURN false;
  END IF;
  
  -- Vérifier le format UUID
  RETURN uuid_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
END;
$$;

COMMENT ON FUNCTION public.is_valid_uuid IS 'Valide strictement qu''une string est un UUID valide';

-- ============================================================================
-- FIX 2: Trigger de validation AVANT insertion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_event_before_insert()
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
  
  -- Vérifier que user_id est valide et correspond à l'utilisateur
  IF NOT public.is_valid_uuid(NEW.user_id::TEXT) THEN
    RAISE EXCEPTION 'user_id invalide: "%" (doit être un UUID valide)', NEW.user_id;
  END IF;
  
  IF NEW.user_id != current_user_id THEN
    RAISE EXCEPTION 'user_id "%" ne correspond pas à l''utilisateur authentifié', NEW.user_id;
  END IF;
  
  -- Vérifier que company_id est valide
  IF NOT public.is_valid_uuid(NEW.company_id::TEXT) THEN
    RAISE EXCEPTION 'company_id invalide: "%" (doit être un UUID valide)', NEW.company_id;
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
    RAISE EXCEPTION 'company_id "%" ne correspond pas à l''entreprise de l''utilisateur', NEW.company_id;
  END IF;
  
  -- Si project_id est défini, vérifier qu'il est valide
  IF NEW.project_id IS NOT NULL THEN
    IF NOT public.is_valid_uuid(NEW.project_id::TEXT) THEN
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
DROP TRIGGER IF EXISTS validate_event_insert_trigger ON public.events;
DROP TRIGGER IF EXISTS validate_event_before_insert_trigger ON public.events;

-- Créer le trigger
CREATE TRIGGER validate_event_before_insert_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_before_insert();

COMMENT ON FUNCTION public.validate_event_before_insert IS 'Valide strictement tous les UUID avant insertion d''un événement';

-- ============================================================================
-- FIX 3: Corriger la RLS policy pour être plus stricte
-- ============================================================================
DO $$
BEGIN
  -- Supprimer l'ancienne policy
  DROP POLICY IF EXISTS "Company users can manage events" ON public.events;
  
  -- Créer une nouvelle policy stricte
  CREATE POLICY "Company users can manage events"
  ON public.events FOR ALL
  USING (
    -- Vérifier que l'utilisateur est authentifié
    auth.uid() IS NOT NULL
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
  );
  
  RAISE NOTICE '✅ RLS policy corrigée pour events';
END $$;

-- ============================================================================
-- FIX 4: S'assurer que current_company_id() est robuste
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID AS $$
DECLARE
  result UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur actuel
  SELECT company_id INTO result
  FROM public.company_users 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- Retourner NULL si aucun trouvé (pas d'erreur, mais sera bloqué par RLS)
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.current_company_id IS 'Retourne le company_id de l''utilisateur actuel, ou NULL si aucun';

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VALIDATION COMPLÈTE ÉVÉNEMENTS !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonction is_valid_uuid() créée';
  RAISE NOTICE '✅ Trigger validate_event_before_insert() créé';
  RAISE NOTICE '✅ RLS policy corrigée (stricte)';
  RAISE NOTICE '✅ current_company_id() sécurisée';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Validation stricte de tous les UUID';
  RAISE NOTICE '🔒 Blocage des valeurs invalides ("events", etc.)';
  RAISE NOTICE '🔒 Vérification user_id = auth.uid()';
  RAISE NOTICE '🔒 Vérification company_id correspond';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
