-- =====================================================
-- SYSTÈME AUTOMATISÉ DE NOTIFICATIONS - VERSION COMPLÈTE
-- =====================================================
-- Ce script crée TOUTES les tables nécessaires puis
-- configure le système de notifications automatiques
-- =====================================================

-- =====================================================
-- 0. CRÉER LES TABLES MANQUANTES SI NÉCESSAIRES
-- =====================================================

-- Table ai_quotes (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.ai_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  surface NUMERIC,
  work_type TEXT,
  materials TEXT[],
  image_urls TEXT[],
  estimated_cost NUMERIC,
  details JSONB,
  status TEXT DEFAULT 'draft',
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table maintenance_reminders (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  installation_date DATE,
  last_maintenance DATE,
  next_maintenance DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table notifications (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  related_table TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Table email_queue (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  type TEXT NOT NULL DEFAULT 'notification',
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retry_count INTEGER DEFAULT 0
);

-- Table projects (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'planifié',
  progress INTEGER DEFAULT 0,
  budget NUMERIC,
  location TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table clients (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'actif',
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. CRÉER LES POLITIQUES RLS DE BASE (si elles n'existent pas)
-- =====================================================

-- Policies pour ai_quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_quotes' AND policyname = 'Users can view their own quotes') THEN
    CREATE POLICY "Users can view their own quotes" 
    ON public.ai_quotes FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_quotes' AND policyname = 'Users can create their own quotes') THEN
    CREATE POLICY "Users can create their own quotes" 
    ON public.ai_quotes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_quotes' AND policyname = 'Users can update their own quotes') THEN
    CREATE POLICY "Users can update their own quotes" 
    ON public.ai_quotes FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_quotes' AND policyname = 'Users can delete their own quotes') THEN
    CREATE POLICY "Users can delete their own quotes" 
    ON public.ai_quotes FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policies pour maintenance_reminders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reminders' AND policyname = 'Users can view their own reminders') THEN
    CREATE POLICY "Users can view their own reminders" 
    ON public.maintenance_reminders FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reminders' AND policyname = 'Users can create their own reminders') THEN
    CREATE POLICY "Users can create their own reminders" 
    ON public.maintenance_reminders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reminders' AND policyname = 'Users can update their own reminders') THEN
    CREATE POLICY "Users can update their own reminders" 
    ON public.maintenance_reminders FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reminders' AND policyname = 'Users can delete their own reminders') THEN
    CREATE POLICY "Users can delete their own reminders" 
    ON public.maintenance_reminders FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policies pour notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
    CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can insert their own notifications') THEN
    CREATE POLICY "Users can insert their own notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can delete their own notifications') THEN
    CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policies pour email_queue
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_queue' AND policyname = 'Users can view their own email queue') THEN
    CREATE POLICY "Users can view their own email queue"
      ON public.email_queue
      FOR SELECT
      USING (auth.uid() = user_id OR auth.uid() IS NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_queue' AND policyname = 'Service role can manage email queue') THEN
    CREATE POLICY "Service role can manage email queue"
      ON public.email_queue
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- 2. MODIFICATIONS DES TABLES EXISTANTES
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
-- 3. TABLE POUR LES PAIEMENTS
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Users can view their own payments') THEN
    CREATE POLICY "Users can view their own payments"
      ON public.payments
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Users can create their own payments') THEN
    CREATE POLICY "Users can create their own payments"
      ON public.payments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Users can update their own payments') THEN
    CREATE POLICY "Users can update their own payments"
      ON public.payments
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Users can delete their own payments') THEN
    CREATE POLICY "Users can delete their own payments"
      ON public.payments
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes pour payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments(quote_id);

-- =====================================================
-- 4. TABLE POUR L'HISTORIQUE DES NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_log' AND policyname = 'Users can view their own notification log') THEN
    CREATE POLICY "Users can view their own notification log"
      ON public.notification_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_log' AND policyname = 'Service can create notification log') THEN
    CREATE POLICY "Service can create notification log"
      ON public.notification_log
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON public.notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON public.notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON public.notification_log(sent_at);

-- Indexes pour notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Indexes pour email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON public.email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_type ON public.email_queue(type);

-- =====================================================
-- 5. FONCTIONS HELPER POUR LES NOTIFICATIONS
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

-- Fonction create_notification (si elle n'existe pas)
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
-- 6. FONCTIONS POUR CHAQUE TYPE DE NOTIFICATION
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
-- 7. TRIGGERS POUR METTRE À JOUR LES DATES
-- =====================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger pour payments
DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour ai_quotes (si n'existe pas)
DROP TRIGGER IF EXISTS update_ai_quotes_updated_at ON public.ai_quotes;
CREATE TRIGGER update_ai_quotes_updated_at
  BEFORE UPDATE ON public.ai_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour maintenance_reminders (si n'existe pas)
DROP TRIGGER IF EXISTS update_maintenance_reminders_updated_at ON public.maintenance_reminders;
CREATE TRIGGER update_maintenance_reminders_updated_at
  BEFORE UPDATE ON public.maintenance_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. VÉRIFICATION FINALE
-- =====================================================

-- Vérifier les tables créées
SELECT 
  '✅ Tables créées' as status,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_quotes', 'maintenance_reminders', 'notifications', 'email_queue', 'payments', 'notification_log', 'projects', 'clients');

-- Vérifier les fonctions créées
SELECT 
  '✅ Fonctions créées' as status,
  COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'check_pending_quotes',
  'check_unconfirmed_quotes',
  'check_upcoming_worksites',
  'check_ending_worksites',
  'check_maintenance_due',
  'check_payments_due',
  'check_overdue_payments',
  'create_notification',
  'create_notification_with_email',
  'get_user_email'
);

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

