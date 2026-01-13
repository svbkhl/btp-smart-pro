-- ============================================================================
-- 📋 SCHÉMA FINAL CORRECT : Table events
-- ============================================================================
-- Description: Schéma définitif et correct de la table events
-- ============================================================================

-- ============================================================================
-- STRUCTURE DE LA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- ⚠️ NULLABLE
  
  -- Données de l'événement
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  type TEXT DEFAULT 'meeting' CHECK (type IN ('meeting', 'task', 'deadline', 'reminder', 'other')),
  color TEXT DEFAULT '#3b82f6',
  
  -- Rappels
  reminder_minutes INTEGER,
  reminder_recurring BOOLEAN DEFAULT false,
  
  -- Google Calendar
  google_event_id TEXT, -- ⚠️ TEXT, pas UUID
  synced_with_google BOOLEAN DEFAULT false,
  google_sync_error TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.events(company_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON public.events(google_event_id) WHERE google_event_id IS NOT NULL;

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_events_updated_at ON public.events;
CREATE TRIGGER trigger_update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_updated_at();

-- ============================================================================
-- TRIGGER: Validation UUID (SÉCURISÉ - sans TG_TABLE_NAME)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_event_before_insert_secure()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation user_id
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id ne peut pas être NULL';
  END IF;
  
  IF NOT (NEW.user_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'user_id invalide: "%" (format UUID invalide)', NEW.user_id;
  END IF;
  
  -- Validation company_id
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id ne peut pas être NULL';
  END IF;
  
  IF NOT (NEW.company_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'company_id invalide: "%" (format UUID invalide)', NEW.company_id;
  END IF;
  
  -- Validation project_id (peut être NULL)
  IF NEW.project_id IS NOT NULL THEN
    IF NOT (NEW.project_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      RAISE EXCEPTION 'project_id invalide: "%" (format UUID invalide)', NEW.project_id;
    END IF;
  ELSE
    NEW.project_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_event_before_insert_secure_trigger ON public.events;
CREATE TRIGGER validate_event_before_insert_secure_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_before_insert_secure();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

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

-- Policy sécurisée
CREATE POLICY "Company users can manage events"
ON public.events FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND company_id = (
    SELECT cu.company_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    LIMIT 1
  )
);

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE public.events IS 'Événements du calendrier (réunions, tâches, échéances, etc.)';
COMMENT ON COLUMN public.events.project_id IS 'Projet associé (optionnel, peut être NULL)';
COMMENT ON COLUMN public.events.google_event_id IS 'ID de l''événement dans Google Calendar (TEXT, pas UUID)';
COMMENT ON COLUMN public.events.company_id IS 'Entreprise propriétaire (requis, UUID)';
