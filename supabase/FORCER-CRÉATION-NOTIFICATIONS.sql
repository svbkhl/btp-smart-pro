-- ============================================
-- FORCER LA CRÉATION : Table Notifications
-- ============================================
-- Ce script force la création de la table notifications
-- ATTENTION : Cela supprime la table si elle existe déjà
-- ============================================

-- ============================================
-- ÉTAPE 1 : Supprimer la table si elle existe
-- ============================================

-- Supprimer les politiques d'abord
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service can create notifications" ON public.notifications;

-- Supprimer les fonctions qui dépendent de la table
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

-- Supprimer la table
DROP TABLE IF EXISTS public.notifications CASCADE;

-- ============================================
-- ÉTAPE 2 : Créer la table
-- ============================================

CREATE TABLE public.notifications (
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

-- ============================================
-- ÉTAPE 3 : Créer les index
-- ============================================

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- ============================================
-- ÉTAPE 4 : Activer RLS
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 5 : Créer les politiques RLS
-- ============================================

-- Politique 1 : SELECT
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Politique 2 : UPDATE
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique 3 : INSERT (utilisateurs)
CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique 4 : DELETE
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Politique 5 : INSERT (service role pour les triggers)
CREATE POLICY "Service can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- ============================================
-- ÉTAPE 6 : Créer la fonction create_notification
-- ============================================

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

-- ============================================
-- ÉTAPE 7 : Vérification
-- ============================================

-- Vérifier que la table existe
SELECT 
    '✅ Table notifications créée' as status,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications';

-- Vérifier les politiques
SELECT 
    '✅ Politiques créées' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- Afficher les colonnes
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Afficher les politiques
SELECT 
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications'
ORDER BY policyname;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- column_count: 9
-- policy_count: 5
-- ============================================

