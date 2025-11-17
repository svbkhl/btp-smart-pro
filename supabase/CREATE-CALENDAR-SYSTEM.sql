-- =====================================================
-- SYSTÈME DE CALENDRIER - Gestion des Événements
-- =====================================================
-- Ce script crée :
-- 1. Table events pour stocker les événements
-- 2. Triggers pour les notifications
-- 3. Indexes pour les performances
-- =====================================================

-- =====================================================
-- 1. TABLE EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  type TEXT DEFAULT 'meeting', -- meeting, task, deadline, reminder, other
  color TEXT DEFAULT '#3b82f6', -- Couleur de l'événement
  reminder_minutes INTEGER, -- Minutes avant l'événement pour le rappel (null = pas de rappel)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies pour events
CREATE POLICY "Users can view their own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON public.events USING btree(start_date, end_date);

-- =====================================================
-- 2. TRIGGER POUR UPDATED_AT
-- =====================================================

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

-- =====================================================
-- 3. TRIGGER POUR VALIDATION DES DATES
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_event_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si end_date est défini, il doit être après start_date
  IF NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'La date de fin doit être après la date de début';
  END IF;
  
  -- Si all_day est true, end_date peut être null (on utilise start_date)
  IF NEW.all_day = true AND NEW.end_date IS NULL THEN
    NEW.end_date = NEW.start_date + INTERVAL '1 day' - INTERVAL '1 second';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_event_dates ON public.events;
CREATE TRIGGER trigger_validate_event_dates
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_dates();

-- =====================================================
-- 4. TRIGGER POUR NOTIFICATIONS
-- =====================================================

-- Notification quand un événement est créé
CREATE OR REPLACE FUNCTION public.notify_on_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name TEXT;
BEGIN
  -- Récupérer le nom du projet si lié
  IF NEW.project_id IS NOT NULL THEN
    SELECT name INTO v_project_name
    FROM public.projects
    WHERE id = NEW.project_id;
  END IF;
  
  -- Créer une notification
  PERFORM public.create_notification(
    NEW.user_id,
    'Nouvel événement créé',
    'L''événement "' || NEW.title || '"' || 
    CASE WHEN v_project_name IS NOT NULL THEN ' pour le projet "' || v_project_name || '"' ELSE '' END ||
    ' a été créé.',
    'info',
    'events',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_event_created ON public.events;
CREATE TRIGGER trigger_notify_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_event_created();

-- =====================================================
-- 5. FONCTION POUR RÉCUPÉRER LES ÉVÉNEMENTS PAR PÉRIODE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_events_by_date_range(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  project_id UUID,
  title TEXT,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN,
  location TEXT,
  type TEXT,
  color TEXT,
  reminder_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  project_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.project_id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.all_day,
    e.location,
    e.type,
    e.color,
    e.reminder_minutes,
    e.created_at,
    e.updated_at,
    p.name as project_name
  FROM public.events e
  LEFT JOIN public.projects p ON p.id = e.project_id
  WHERE e.user_id = p_user_id
    AND (
      -- Événements qui commencent dans la période
      (e.start_date >= p_start_date AND e.start_date <= p_end_date)
      -- Événements qui se terminent dans la période
      OR (e.end_date IS NOT NULL AND e.end_date >= p_start_date AND e.end_date <= p_end_date)
      -- Événements qui couvrent toute la période
      OR (e.start_date <= p_start_date AND (e.end_date IS NULL OR e.end_date >= p_end_date))
    )
  ORDER BY e.start_date ASC;
END;
$$;

-- =====================================================
-- 6. FONCTION POUR RÉCUPÉRER LES ÉVÉNEMENTS DU JOUR
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_today_events(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  type TEXT,
  color TEXT,
  project_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start TIMESTAMP WITH TIME ZONE;
  v_today_end TIMESTAMP WITH TIME ZONE;
BEGIN
  v_today_start := DATE_TRUNC('day', CURRENT_TIMESTAMP);
  v_today_end := v_today_start + INTERVAL '1 day' - INTERVAL '1 second';
  
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.start_date,
    e.end_date,
    e.type,
    e.color,
    p.name as project_name
  FROM public.events e
  LEFT JOIN public.projects p ON p.id = e.project_id
  WHERE e.user_id = p_user_id
    AND (
      (e.start_date >= v_today_start AND e.start_date <= v_today_end)
      OR (e.end_date IS NOT NULL AND e.end_date >= v_today_start AND e.end_date <= v_today_end)
      OR (e.start_date <= v_today_start AND (e.end_date IS NULL OR e.end_date >= v_today_end))
    )
  ORDER BY e.start_date ASC;
END;
$$;

-- =====================================================
-- 7. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.events IS 'Événements du calendrier (réunions, tâches, échéances, etc.)';
COMMENT ON COLUMN public.events.type IS 'Type d''événement : meeting, task, deadline, reminder, other';
COMMENT ON COLUMN public.events.all_day IS 'Si true, l''événement dure toute la journée';
COMMENT ON COLUMN public.events.reminder_minutes IS 'Minutes avant l''événement pour le rappel (null = pas de rappel)';
COMMENT ON FUNCTION public.get_events_by_date_range(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Récupère les événements dans une plage de dates';
COMMENT ON FUNCTION public.get_today_events(UUID) IS 'Récupère les événements du jour';

-- =====================================================
-- FIN DU SYSTÈME DE CALENDRIER
-- =====================================================

