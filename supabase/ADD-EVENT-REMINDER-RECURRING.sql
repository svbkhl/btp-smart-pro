-- =====================================================
-- AJOUT DE LA COLONNE reminder_recurring POUR LES ÉVÉNEMENTS
-- =====================================================
-- Cette colonne permet de définir si un rappel doit être
-- envoyé à chaque occurrence d'un événement récurrent
-- =====================================================

-- Ajouter la colonne reminder_recurring si elle n'existe pas
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS reminder_recurring BOOLEAN DEFAULT false;

-- Commentaire pour la colonne
COMMENT ON COLUMN public.events.reminder_recurring IS 'Si true, le rappel sera envoyé à chaque occurrence de l''événement (pour événements récurrents)';

-- Index pour améliorer les performances des requêtes de rappels
CREATE INDEX IF NOT EXISTS idx_events_reminder_minutes ON public.events(reminder_minutes) 
WHERE reminder_minutes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_start_date_reminder ON public.events(start_date, reminder_minutes) 
WHERE reminder_minutes IS NOT NULL;

-- =====================================================
-- FONCTION POUR VÉRIFIER ET ENVOYER LES RAPPELS D'ÉVÉNEMENTS
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_and_send_event_reminders()
RETURNS TABLE (
  event_id UUID,
  user_id UUID,
  title TEXT,
  reminder_sent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_reminder_time TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE;
  v_notification_created BOOLEAN;
  v_time_remaining TEXT;
  v_days_remaining INTEGER;
  v_hours_remaining INTEGER;
  v_minutes_remaining INTEGER;
BEGIN
  v_now := NOW();
  
  -- Parcourir tous les événements avec un rappel configuré
  FOR v_event IN
    SELECT 
      e.id,
      e.user_id,
      e.title,
      e.start_date,
      e.reminder_minutes,
      e.reminder_recurring,
      e.description,
      e.location,
      e.type,
      e.project_id,
      p.name as project_name
    FROM public.events e
    LEFT JOIN public.projects p ON p.id = e.project_id
    WHERE e.reminder_minutes IS NOT NULL
      AND (
        -- Pour les rappels récurrents : vérifier tous les jours une fois que la date du rappel est atteinte
        -- Y compris le jour J (jour de l'événement)
        (e.reminder_recurring = true 
          AND v_now >= (e.start_date - (e.reminder_minutes * INTERVAL '1 minute'))
          AND v_now <= e.start_date)
        OR
        -- Pour les rappels normaux : vérifier dans une fenêtre de 15 minutes (événement futur uniquement)
        (e.reminder_recurring = false
          AND e.start_date > v_now
          AND v_now >= (e.start_date - (e.reminder_minutes * INTERVAL '1 minute') - INTERVAL '15 minutes')
          AND v_now <= (e.start_date - (e.reminder_minutes * INTERVAL '1 minute') + INTERVAL '15 minutes')
          AND v_now < e.start_date)
      )
  LOOP
    v_notification_created := false;
    
    -- Si reminder_recurring est activé, vérifier si un rappel a été envoyé AUJOURD'HUI
    -- Sinon, vérifier si un rappel a déjà été créé pour cet événement
    IF v_event.reminder_recurring THEN
      -- Pour les rappels récurrents : vérifier si un rappel a été envoyé aujourd'hui
      -- Cela permet d'envoyer un rappel tous les jours jusqu'au jour J inclus
      SELECT EXISTS(
        SELECT 1 
        FROM public.notifications 
        WHERE related_table = 'events' 
          AND related_id = v_event.id
          AND type = 'reminder'
          AND DATE(created_at) = DATE(v_now)  -- Vérifier si un rappel a été envoyé aujourd'hui
      ) INTO v_notification_created;
    ELSE
      -- Pour les rappels normaux : vérifier si un rappel a déjà été créé
      SELECT EXISTS(
        SELECT 1 
        FROM public.notifications 
        WHERE related_table = 'events' 
          AND related_id = v_event.id
          AND type = 'reminder'
          AND created_at >= (v_event.start_date - (v_event.reminder_minutes * INTERVAL '1 minute'))
          AND created_at < v_event.start_date
      ) INTO v_notification_created;
    END IF;
    
    -- Si aucune notification n'a été créée, en créer une
    IF NOT v_notification_created THEN
      -- Calculer le temps restant jusqu'à l'événement
      v_days_remaining := EXTRACT(EPOCH FROM (v_event.start_date - v_now))::INTEGER / 86400;
      v_hours_remaining := (EXTRACT(EPOCH FROM (v_event.start_date - v_now))::INTEGER % 86400) / 3600;
      v_minutes_remaining := (EXTRACT(EPOCH FROM (v_event.start_date - v_now))::INTEGER % 3600) / 60;
      
      -- Formater le temps restant
      IF v_event.reminder_recurring THEN
        -- Pour les rappels récurrents, afficher le temps réel restant
        IF DATE(v_event.start_date) = DATE(v_now) THEN
          v_time_remaining := 'aujourd''hui';
        ELSIF v_days_remaining > 0 THEN
          v_time_remaining := v_days_remaining || ' jour' || CASE WHEN v_days_remaining > 1 THEN 's' ELSE '' END;
        ELSIF v_hours_remaining > 0 THEN
          v_time_remaining := v_hours_remaining || ' heure' || CASE WHEN v_hours_remaining > 1 THEN 's' ELSE '' END;
        ELSE
          v_time_remaining := v_minutes_remaining || ' minute' || CASE WHEN v_minutes_remaining > 1 THEN 's' ELSE '' END;
        END IF;
      ELSE
        -- Pour les rappels normaux, afficher le délai configuré
        IF v_event.reminder_minutes < 60 THEN
          v_time_remaining := v_event.reminder_minutes || ' minutes';
        ELSIF v_event.reminder_minutes < 1440 THEN
          v_time_remaining := (v_event.reminder_minutes / 60) || ' heure(s)';
        ELSIF v_event.reminder_minutes < 10080 THEN
          v_time_remaining := (v_event.reminder_minutes / 1440) || ' jour(s)';
        ELSE
          v_time_remaining := (v_event.reminder_minutes / 10080) || ' semaine(s)';
        END IF;
      END IF;
      
      -- Créer la notification
      PERFORM public.create_notification(
        v_event.user_id,
        '🔔 Rappel : ' || v_event.title,
        'L''événement "' || v_event.title || '"' ||
        CASE 
          WHEN v_event.project_name IS NOT NULL THEN ' pour le projet "' || v_event.project_name || '"' 
          ELSE '' 
        END ||
        ' est prévu ' ||
        CASE 
          WHEN v_event.reminder_recurring AND DATE(v_event.start_date) = DATE(v_now) THEN 'aujourd''hui'
          WHEN v_event.reminder_recurring THEN 'dans ' || v_time_remaining
          ELSE v_time_remaining || ' dans'
        END ||
        CASE 
          WHEN v_event.location IS NOT NULL THEN ' à ' || v_event.location
          ELSE ''
        END ||
        '.',
        'info',
        'events',
        v_event.id
      );
      
      -- Retourner l'événement avec le statut
      RETURN QUERY SELECT 
        v_event.id,
        v_event.user_id,
        v_event.title,
        true as reminder_sent;
    ELSE
      -- Notification déjà créée
      RETURN QUERY SELECT 
        v_event.id,
        v_event.user_id,
        v_event.title,
        false as reminder_sent;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Commentaire pour la fonction
COMMENT ON FUNCTION public.check_and_send_event_reminders() IS 'Vérifie et envoie les rappels pour les événements à venir. Doit être appelée régulièrement (cron job)';

-- =====================================================
-- FIN
-- =====================================================

