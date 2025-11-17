-- =====================================================
-- SYSTÈME AUTOMATISÉ DE NOTIFICATIONS ET EMAILS BTP
-- =====================================================
-- Ce script crée le système complet pour les notifications
-- et emails automatiques pour une application BTP
-- =====================================================

-- =====================================================
-- 1. MODIFICATIONS DES TABLES EXISTANTES
-- =====================================================

-- Ajouter des colonnes à ai_quotes pour le suivi des devis
ALTER TABLE public.ai_quotes 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmation_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Ajouter des colonnes à projects pour les notifications
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS notification_start_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_end_sent BOOLEAN DEFAULT false;

-- Ajouter des colonnes à maintenance_reminders pour les notifications
ALTER TABLE public.maintenance_reminders
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- 2. TABLE POUR LES PAIEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies pour payments
CREATE POLICY "Users can view their own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments"
  ON public.payments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments"
  ON public.payments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes pour payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments(quote_id);

-- =====================================================
-- 3. TABLE POUR L'HISTORIQUE DES NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'quote_pending', 'quote_unconfirmed', 'worksite_start', 'worksite_end', 'maintenance_due', 'payment_due', 'payment_overdue'
  related_table TEXT,
  related_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  email_sent BOOLEAN DEFAULT false,
  email_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Policies pour notification_log
CREATE POLICY "Users can view their own notification log"
  ON public.notification_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can create notification log"
  ON public.notification_log
  FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON public.notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON public.notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON public.notification_log(sent_at);

-- =====================================================
-- 4. FONCTIONS HELPER POUR LES NOTIFICATIONS
-- =====================================================

-- Fonction helper pour récupérer l'email d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Récupérer l'email depuis auth.users (accessible avec SECURITY DEFINER)
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;
  
  RETURN v_email;
END;
$$;

-- Fonction pour créer une notification et un email
CREATE OR REPLACE FUNCTION public.create_notification_with_email(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_related_table TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_email_to TEXT DEFAULT NULL,
  p_email_subject TEXT DEFAULT NULL,
  p_email_html TEXT DEFAULT NULL,
  p_notification_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_notification_id UUID;
  v_email_id UUID;
  v_log_id UUID;
  v_user_email TEXT;
BEGIN
  -- Créer la notification
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
  RETURNING id INTO v_notification_id;

  -- Récupérer l'email de l'utilisateur si non fourni
  IF p_email_to IS NULL THEN
    v_user_email := public.get_user_email(p_user_id);
  ELSE
    v_user_email := p_email_to;
  END IF;

  -- Créer l'email si l'adresse email est fournie
  IF v_user_email IS NOT NULL AND p_email_subject IS NOT NULL AND p_email_html IS NOT NULL THEN
    INSERT INTO public.email_queue (
      user_id,
      to_email,
      subject,
      html_content,
      type,
      status
    ) VALUES (
      p_user_id,
      v_user_email,
      p_email_subject,
      p_email_html,
      COALESCE(p_notification_type, 'notification'),
      'pending'
    )
    RETURNING id INTO v_email_id;
  END IF;

  -- Enregistrer dans le log
  INSERT INTO public.notification_log (
    user_id,
    notification_type,
    related_table,
    related_id,
    notification_id,
    email_sent,
    email_id
  ) VALUES (
    p_user_id,
    COALESCE(p_notification_type, p_type),
    p_related_table,
    p_related_id,
    v_notification_id,
    (v_email_id IS NOT NULL),
    v_email_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_notification_id;
END;
$$;

-- =====================================================
-- 5. FONCTIONS POUR CHAQUE TYPE DE NOTIFICATION
-- =====================================================

-- Fonction pour vérifier les devis en attente > 3 jours
CREATE OR REPLACE FUNCTION public.check_pending_quotes()
RETURNS TABLE(
  quote_id UUID,
  user_id UUID,
  client_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  days_pending INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.user_id,
    q.client_name,
    q.created_at,
    EXTRACT(DAY FROM (NOW() - q.created_at))::INTEGER as days_pending
  FROM public.ai_quotes q
  WHERE q.status = 'draft'
    AND q.sent_at IS NULL
    AND q.created_at < NOW() - INTERVAL '3 days'
    AND (q.reminder_sent_at IS NULL OR q.reminder_sent_at < NOW() - INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_log nl
      WHERE nl.related_table = 'ai_quotes'
        AND nl.related_id = q.id
        AND nl.notification_type = 'quote_pending'
        AND nl.sent_at > NOW() - INTERVAL '1 day'
    );
END;
$$;

-- Fonction pour vérifier les devis non confirmés > 7 jours
CREATE OR REPLACE FUNCTION public.check_unconfirmed_quotes()
RETURNS TABLE(
  quote_id UUID,
  user_id UUID,
  client_name TEXT,
  client_email TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  days_unconfirmed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.user_id,
    q.client_name,
    q.client_email,
    q.sent_at,
    EXTRACT(DAY FROM (NOW() - q.sent_at))::INTEGER as days_unconfirmed
  FROM public.ai_quotes q
  WHERE q.status IN ('draft', 'sent')
    AND q.sent_at IS NOT NULL
    AND q.confirmed_at IS NULL
    AND q.sent_at < NOW() - INTERVAL '7 days'
    AND (q.confirmation_reminder_sent_at IS NULL OR q.confirmation_reminder_sent_at < NOW() - INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_log nl
      WHERE nl.related_table = 'ai_quotes'
        AND nl.related_id = q.id
        AND nl.notification_type = 'quote_unconfirmed'
        AND nl.sent_at > NOW() - INTERVAL '1 day'
    );
END;
$$;

-- Fonction pour vérifier les chantiers qui commencent bientôt
CREATE OR REPLACE FUNCTION public.check_upcoming_worksites()
RETURNS TABLE(
  project_id UUID,
  user_id UUID,
  project_name TEXT,
  start_date DATE,
  days_until_start INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.name,
    p.start_date,
    EXTRACT(DAY FROM (p.start_date - CURRENT_DATE))::INTEGER as days_until_start
  FROM public.projects p
  WHERE p.start_date IS NOT NULL
    AND p.start_date >= CURRENT_DATE
    AND p.start_date <= CURRENT_DATE + INTERVAL '1 day'
    AND p.status IN ('planifié', 'en_attente')
    AND (p.notification_start_sent = false OR p.notification_start_sent IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_log nl
      WHERE nl.related_table = 'projects'
        AND nl.related_id = p.id
        AND nl.notification_type = 'worksite_start'
        AND nl.sent_at > NOW() - INTERVAL '1 day'
    );
END;
$$;

-- Fonction pour vérifier les chantiers qui se terminent bientôt
CREATE OR REPLACE FUNCTION public.check_ending_worksites()
RETURNS TABLE(
  project_id UUID,
  user_id UUID,
  project_name TEXT,
  end_date DATE,
  days_until_end INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.name,
    p.end_date,
    EXTRACT(DAY FROM (p.end_date - CURRENT_DATE))::INTEGER as days_until_end
  FROM public.projects p
  WHERE p.end_date IS NOT NULL
    AND p.end_date >= CURRENT_DATE
    AND p.end_date <= CURRENT_DATE + INTERVAL '1 day'
    AND p.status IN ('en_cours', 'planifié')
    AND (p.notification_end_sent = false OR p.notification_end_sent IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_log nl
      WHERE nl.related_table = 'projects'
        AND nl.related_id = p.id
        AND nl.notification_type = 'worksite_end'
        AND nl.sent_at > NOW() - INTERVAL '1 day'
    );
END;
$$;

-- Fonction pour vérifier les échéances de maintenance
CREATE OR REPLACE FUNCTION public.check_maintenance_due()
RETURNS TABLE(
  reminder_id UUID,
  user_id UUID,
  client_name TEXT,
  equipment_type TEXT,
  next_maintenance DATE,
  days_until_maintenance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.id,
    mr.user_id,
    mr.client_name,
    mr.equipment_type,
    mr.next_maintenance,
    EXTRACT(DAY FROM (mr.next_maintenance - CURRENT_DATE))::INTEGER as days_until_maintenance
  FROM public.maintenance_reminders mr
  WHERE mr.status = 'pending'
    AND mr.next_maintenance >= CURRENT_DATE
    AND mr.next_maintenance <= CURRENT_DATE + INTERVAL '7 days'
    AND (mr.notification_sent = false OR mr.notification_sent IS NULL OR mr.notification_sent_at < mr.next_maintenance - INTERVAL '3 days')
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_log nl
      WHERE nl.related_table = 'maintenance_reminders'
        AND nl.related_id = mr.id
        AND nl.notification_type = 'maintenance_due'
        AND nl.sent_at > NOW() - INTERVAL '1 day'
    );
END;
$$;

-- Fonction pour vérifier les paiements dus
CREATE OR REPLACE FUNCTION public.check_payments_due()
RETURNS TABLE(
  payment_id UUID,
  user_id UUID,
  project_id UUID,
  amount NUMERIC,
  due_date DATE,
  days_until_due INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.project_id,
    p.amount,
    p.due_date,
    EXTRACT(DAY FROM (p.due_date - CURRENT_DATE))::INTEGER as days_until_due
  FROM public.payments p
  WHERE p.status = 'pending'
    AND p.due_date >= CURRENT_DATE
    AND p.due_date <= CURRENT_DATE + INTERVAL '3 days'
    AND (p.reminder_sent_at IS NULL OR p.reminder_sent_at < p.due_date - INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_log nl
      WHERE nl.related_table = 'payments'
        AND nl.related_id = p.id
        AND nl.notification_type = 'payment_due'
        AND nl.sent_at > NOW() - INTERVAL '1 day'
    );
END;
$$;

-- Fonction pour vérifier les paiements en retard
CREATE OR REPLACE FUNCTION public.check_overdue_payments()
RETURNS TABLE(
  payment_id UUID,
  user_id UUID,
  project_id UUID,
  amount NUMERIC,
  due_date DATE,
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.project_id,
    p.amount,
    p.due_date,
    EXTRACT(DAY FROM (CURRENT_DATE - p.due_date))::INTEGER as days_overdue
  FROM public.payments p
  WHERE p.status = 'pending'
    AND p.due_date < CURRENT_DATE
    AND (p.reminder_sent_at IS NULL OR p.reminder_sent_at < NOW() - INTERVAL '7 days')
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_log nl
      WHERE nl.related_table = 'payments'
        AND nl.related_id = p.id
        AND nl.notification_type = 'payment_overdue'
        AND nl.sent_at > NOW() - INTERVAL '7 days'
    );
END;
$$;

-- =====================================================
-- 6. TRIGGERS POUR METTRE À JOUR LES DATES
-- =====================================================

-- Trigger pour mettre à jour updated_at sur payments
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payments_updated_at();

-- =====================================================
-- 7. COMMENTAIRES POUR LA DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.payments IS 'Stores payment information for projects and quotes';
COMMENT ON TABLE public.notification_log IS 'Logs all automated notifications sent to users';
COMMENT ON FUNCTION public.create_notification_with_email IS 'Creates a notification and optionally queues an email';
COMMENT ON FUNCTION public.check_pending_quotes IS 'Returns quotes that have been pending for more than 3 days';
COMMENT ON FUNCTION public.check_unconfirmed_quotes IS 'Returns quotes that have been unconfirmed for more than 7 days';
COMMENT ON FUNCTION public.check_upcoming_worksites IS 'Returns worksites that start within 1 day';
COMMENT ON FUNCTION public.check_ending_worksites IS 'Returns worksites that end within 1 day';
COMMENT ON FUNCTION public.check_maintenance_due IS 'Returns maintenance reminders due within 7 days';
COMMENT ON FUNCTION public.check_payments_due IS 'Returns payments due within 3 days';
COMMENT ON FUNCTION public.check_overdue_payments IS 'Returns payments that are overdue';

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

