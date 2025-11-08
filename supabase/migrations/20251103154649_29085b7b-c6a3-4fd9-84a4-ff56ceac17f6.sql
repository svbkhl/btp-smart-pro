-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);

-- Table des rôles utilisateurs (utilise app_role enum existant)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function sécurisée pour vérifier les rôles (avec le bon type app_role)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policies pour user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Dirigeants can view all roles" ON public.user_roles;
CREATE POLICY "Dirigeants can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Table des notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  related_table TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies pour notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Trigger pour créer des notifications automatiques pour les dirigeants lors de nouveaux rappels de maintenance
CREATE OR REPLACE FUNCTION public.notify_dirigeants_on_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dirigeant_record RECORD;
BEGIN
  FOR dirigeant_record IN 
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'dirigeant'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_table, related_id)
    VALUES (
      dirigeant_record.user_id,
      'Nouveau rappel de maintenance',
      'Un nouveau rappel de maintenance a été créé pour ' || NEW.client_name || ' - ' || NEW.equipment_type,
      'warning',
      'maintenance_reminders',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_maintenance ON public.maintenance_reminders;
CREATE TRIGGER trigger_notify_maintenance
  AFTER INSERT ON public.maintenance_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dirigeants_on_maintenance();

-- Trigger pour notifier les dirigeants des nouveaux devis
CREATE OR REPLACE FUNCTION public.notify_dirigeants_on_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dirigeant_record RECORD;
BEGIN
  FOR dirigeant_record IN 
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'dirigeant'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_table, related_id)
    VALUES (
      dirigeant_record.user_id,
      'Nouveau devis généré',
      'Un nouveau devis a été créé pour ' || COALESCE(NEW.client_name, 'un client') || ' - Montant: ' || COALESCE(NEW.estimated_cost::text, 'N/A') || '€',
      'info',
      'ai_quotes',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_quote ON public.ai_quotes;
CREATE TRIGGER trigger_notify_quote
  AFTER INSERT ON public.ai_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dirigeants_on_quote();

-- Trigger pour notifier quand un devis est signé
CREATE OR REPLACE FUNCTION public.notify_on_quote_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dirigeant_record RECORD;
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN
    FOR dirigeant_record IN 
      SELECT user_id 
      FROM public.user_roles 
      WHERE role = 'dirigeant'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, related_table, related_id)
      VALUES (
        dirigeant_record.user_id,
        'Devis signé!',
        'Le devis pour ' || COALESCE(NEW.client_name, 'un client') || ' a été signé - Montant: ' || COALESCE(NEW.estimated_cost::text, 'N/A') || '€',
        'success',
        'ai_quotes',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_quote_signed ON public.ai_quotes;
CREATE TRIGGER trigger_notify_quote_signed
  AFTER UPDATE ON public.ai_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_quote_signed();