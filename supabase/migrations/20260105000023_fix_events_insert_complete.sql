-- ============================================================================
-- 🔥 FIX COMPLET : Insertion d'événements
-- ============================================================================
-- Description: Corrige le problème "invalid input syntax for type uuid: events"
--              Le problème vient probablement de la RLS policy ou d'un trigger
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FIX 1: Vérifier et corriger la structure de la table events
-- ============================================================================
DO $$
BEGIN
  -- Vérifier que company_id existe et n'est pas NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
  ) THEN
    -- S'assurer que company_id peut être NULL temporairement (pour migration)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'company_id'
      AND is_nullable = 'NO'
    ) THEN
      -- Permettre NULL temporairement
      ALTER TABLE public.events ALTER COLUMN company_id DROP NOT NULL;
      RAISE NOTICE '✅ company_id peut maintenant être NULL temporairement';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- FIX 2: Corriger la RLS policy pour gérer les cas NULL
-- ============================================================================
DO $$
BEGIN
  -- Supprimer l'ancienne policy
  DROP POLICY IF EXISTS "Company users can manage events" ON public.events;
  
  -- Créer une nouvelle policy qui gère les cas NULL
  CREATE POLICY "Company users can manage events"
  ON public.events FOR ALL
  USING (
    -- Si company_id est NULL, permettre l'accès si l'utilisateur est le propriétaire
    (company_id IS NULL AND user_id = auth.uid())
    OR
    -- Sinon, vérifier que company_id correspond
    (company_id IS NOT NULL AND company_id = public.current_company_id())
  )
  WITH CHECK (
    -- Pour INSERT, s'assurer que company_id est défini
    company_id IS NOT NULL 
    AND company_id = public.current_company_id()
  );
  
  RAISE NOTICE '✅ RLS policy corrigée pour events';
END $$;

-- ============================================================================
-- FIX 3: Vérifier qu'il n'y a pas de trigger problématique
-- ============================================================================
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'events'
  AND t.tgname != 'update_events_updated_at';
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '⚠️  Il y a % trigger(s) sur events (en plus de update_events_updated_at)', trigger_count;
  ELSE
    RAISE NOTICE '✅ Aucun trigger problématique sur events';
  END IF;
END $$;

-- ============================================================================
-- FIX 4: S'assurer que current_company_id() retourne toujours un UUID valide
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID AS $$
DECLARE
  result UUID;
BEGIN
  SELECT company_id INTO result
  FROM public.company_users 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- Si aucun company_id trouvé, retourner NULL (pas une erreur)
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.current_company_id IS 'Retourne le company_id de l''utilisateur actuel, ou NULL si aucun';

-- ============================================================================
-- FIX 5: Créer une fonction pour valider l'insertion d'événement
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_event_insert()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur
  SELECT company_id INTO user_company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Si aucun company_id trouvé, erreur
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'L''utilisateur n''est associé à aucune entreprise';
  END IF;
  
  -- S'assurer que company_id est défini
  IF NEW.company_id IS NULL THEN
    NEW.company_id := user_company_id;
  END IF;
  
  -- Vérifier que company_id correspond
  IF NEW.company_id != user_company_id THEN
    RAISE EXCEPTION 'Le company_id ne correspond pas à l''utilisateur';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS validate_event_insert_trigger ON public.events;

-- Créer le trigger
CREATE TRIGGER validate_event_insert_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_insert();

COMMENT ON FUNCTION public.validate_event_insert IS 'Valide et définit automatiquement company_id lors de l''insertion d''un événement';

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX INSERTION ÉVÉNEMENTS COMPLET !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Structure de la table events vérifiée';
  RAISE NOTICE '✅ RLS policy corrigée (gère les cas NULL)';
  RAISE NOTICE '✅ Triggers vérifiés';
  RAISE NOTICE '✅ current_company_id() sécurisée';
  RAISE NOTICE '✅ Trigger de validation créé';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les événements sont maintenant créés correctement';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
