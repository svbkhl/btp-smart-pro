-- =====================================================
-- SYSTÈME D'EMAILS ET NOTIFICATIONS AVANCÉ
-- =====================================================
-- Ce script crée :
-- 1. Table email_queue pour la gestion des emails
-- 2. Triggers pour créer des notifications automatiques
-- 3. Fonctions pour les emails de confirmation et relances
-- =====================================================

-- =====================================================
-- 1. TABLE EMAIL_QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  type TEXT NOT NULL DEFAULT 'notification', -- confirmation, reminder, notification, quote
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  external_id TEXT, -- ID from email service (Resend, SendGrid, etc.)
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retry_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Policies pour email_queue
CREATE POLICY "Users can view their own email queue"
  ON public.email_queue
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Service role can manage email queue"
  ON public.email_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON public.email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_type ON public.email_queue(type);

-- =====================================================
-- 2. TRIGGERS POUR NOTIFICATIONS AUTOMATIQUES
-- =====================================================

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_related_table TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    related_table,
    related_id
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_related_table,
    p_related_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- =====================================================
-- 3. TRIGGERS POUR PROJETS
-- =====================================================

-- Notification quand un nouveau projet est créé
CREATE OR REPLACE FUNCTION public.notify_on_project_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer une notification pour l'utilisateur
  PERFORM public.create_notification(
    NEW.user_id,
    'Nouveau projet créé',
    'Le projet "' || NEW.name || '" a été créé avec succès.',
    'success',
    'projects',
    NEW.id
  );
  
  -- Envoyer un email de confirmation (automatiquement via la queue)
  PERFORM public.send_project_confirmation_email(NEW.id);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_project_created ON public.projects;
CREATE TRIGGER trigger_notify_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_project_created();

-- Notification quand un projet est en retard
CREATE OR REPLACE FUNCTION public.notify_on_project_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si le projet est en retard
  IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE AND NEW.status != 'termine' THEN
    -- Créer une notification urgente
    PERFORM public.create_notification(
      NEW.user_id,
      'Projet en retard',
      'Le projet "' || NEW.name || '" est en retard. Date de fin prévue : ' || NEW.end_date::TEXT,
      'urgent',
      'projects',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_project_overdue ON public.projects;
CREATE TRIGGER trigger_notify_project_overdue
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_project_overdue();

-- Notification quand le statut d'un projet change
CREATE OR REPLACE FUNCTION public.notify_on_project_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Statut du projet mis à jour',
      'Le projet "' || NEW.name || '" est maintenant "' || NEW.status || '".',
      'info',
      'projects',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_project_status_change ON public.projects;
CREATE TRIGGER trigger_notify_project_status_change
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_project_status_change();

-- =====================================================
-- 4. TRIGGERS POUR CLIENTS
-- =====================================================

-- Notification quand un nouveau client est créé
CREATE OR REPLACE FUNCTION public.notify_on_client_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'Nouveau client ajouté',
    'Le client "' || NEW.name || '" a été ajouté avec succès.',
    'success',
    'clients',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_client_created ON public.clients;
CREATE TRIGGER trigger_notify_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_client_created();

-- =====================================================
-- 5. FONCTIONS POUR EMAILS DE CONFIRMATION
-- =====================================================

-- Fonction pour envoyer un email de confirmation de projet
CREATE OR REPLACE FUNCTION public.send_project_confirmation_email(
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_user_email TEXT;
  v_client_email TEXT;
  v_html_content TEXT;
  v_user_settings RECORD;
BEGIN
  -- Récupérer les informations du projet
  SELECT 
    p.*,
    u.email as user_email,
    c.email as client_email,
    c.name as client_name
  INTO v_project
  FROM public.projects p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.clients c ON c.id = p.client_id
  WHERE p.id = p_project_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier les paramètres utilisateur pour les notifications email
  SELECT email_notifications, email INTO v_user_settings
  FROM public.user_settings
  WHERE user_id = v_project.user_id;
  
  -- Générer le contenu HTML de l'email
  v_html_content := '
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .project-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nouveau Projet Créé</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Un nouveau projet a été créé dans votre système de gestion :</p>
          <div class="project-info">
            <h2>' || v_project.name || '</h2>
            <p><strong>Client :</strong> ' || COALESCE(v_project.client_name, 'N/A') || '</p>
            <p><strong>Statut :</strong> ' || v_project.status || '</p>
            <p><strong>Budget :</strong> ' || COALESCE(v_project.budget::TEXT, 'N/A') || ' €</p>
            <p><strong>Date de début :</strong> ' || COALESCE(v_project.start_date::TEXT, 'N/A') || '</p>
            <p><strong>Date de fin :</strong> ' || COALESCE(v_project.end_date::TEXT, 'N/A') || '</p>
          </div>
          <p>Cordialement,<br>Équipe Edifice Opus One</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement par votre système de gestion.</p>
        </div>
      </div>
    </body>
    </html>
  ';
  
  -- Ajouter l'email à la queue pour l'utilisateur (si notifications email activées)
  IF v_project.user_email IS NOT NULL AND (v_user_settings IS NULL OR v_user_settings.email_notifications = true) THEN
    INSERT INTO public.email_queue (
      user_id,
      to_email,
      subject,
      html_content,
      type,
      status
    ) VALUES (
      v_project.user_id,
      COALESCE(v_user_settings.email, v_project.user_email),
      'Confirmation : Nouveau projet "' || v_project.name || '"',
      v_html_content,
      'confirmation',
      'pending'
    );
  END IF;
  
  -- Ajouter l'email à la queue pour le client (si email disponible)
  IF v_project.client_email IS NOT NULL AND v_project.client_email != '' THEN
    INSERT INTO public.email_queue (
      user_id,
      to_email,
      subject,
      html_content,
      type,
      status
    ) VALUES (
      v_project.user_id,
      v_project.client_email,
      'Votre projet "' || v_project.name || '"',
      REPLACE(v_html_content, 'Bonjour,', 'Bonjour ' || v_project.client_name || ','),
      'confirmation',
      'pending'
    );
  END IF;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 6. FONCTION POUR RELANCES AUTOMATIQUES
-- =====================================================

-- Fonction pour envoyer des relances pour projets en retard
CREATE OR REPLACE FUNCTION public.send_overdue_project_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_count INTEGER := 0;
  v_user_email TEXT;
  v_html_content TEXT;
BEGIN
  -- Récupérer tous les projets en retard
  FOR v_project IN
    SELECT 
      p.*,
      u.email as user_email,
      c.name as client_name,
      c.email as client_email
    FROM public.projects p
    JOIN auth.users u ON u.id = p.user_id
    LEFT JOIN public.clients c ON c.id = p.client_id
    WHERE p.end_date IS NOT NULL 
      AND p.end_date < CURRENT_DATE 
      AND p.status != 'termine'
      AND p.status != 'annule'
  LOOP
    -- Générer le contenu HTML de l'email de relance
    v_html_content := '
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .project-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #dc2626; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Projet en Retard</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Le projet suivant est en retard :</p>
            <div class="project-info">
              <h2>' || v_project.name || '</h2>
              <p><strong>Client :</strong> ' || COALESCE(v_project.client_name, 'N/A') || '</p>
              <p><strong>Date de fin prévue :</strong> ' || v_project.end_date::TEXT || '</p>
              <p><strong>Statut actuel :</strong> ' || v_project.status || '</p>
            </div>
            <p>Veuillez prendre les mesures nécessaires pour terminer ce projet.</p>
            <p>Cordialement,<br>Équipe Edifice Opus One</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de gestion.</p>
          </div>
        </div>
      </body>
      </html>
    ';
    
    -- Ajouter l'email à la queue pour l'utilisateur
    IF v_project.user_email IS NOT NULL THEN
      INSERT INTO public.email_queue (
        user_id,
        to_email,
        subject,
        html_content,
        type,
        status
      ) VALUES (
        v_project.user_id,
        v_project.user_email,
        '⚠️ Relance : Projet en retard - "' || v_project.name || '"',
        v_html_content,
        'reminder',
        'pending'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 7. FONCTION POUR VÉRIFIER ET ENVOYER LES EMAILS EN QUEUE
-- =====================================================

-- Fonction pour traiter les emails en attente (à appeler via cron job)
CREATE OR REPLACE FUNCTION public.process_email_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Traiter les emails en attente (limite de 10 à la fois pour éviter la surcharge)
  FOR v_email IN
    SELECT *
    FROM public.email_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    -- Ici, vous appelleriez votre service d'email (Resend, SendGrid, etc.)
    -- Pour l'instant, on marque juste comme "sent" (simulation)
    -- En production, vous devriez appeler l'Edge Function send-email
    
    UPDATE public.email_queue
    SET 
      status = 'sent',
      sent_at = CURRENT_TIMESTAMP
    WHERE id = v_email.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 8. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.email_queue IS 'Queue pour les emails à envoyer';
COMMENT ON FUNCTION public.send_project_confirmation_email(UUID) IS 'Envoie un email de confirmation quand un projet est créé';
COMMENT ON FUNCTION public.send_overdue_project_reminders() IS 'Envoie des relances pour les projets en retard';
COMMENT ON FUNCTION public.process_email_queue() IS 'Traite les emails en attente dans la queue';

