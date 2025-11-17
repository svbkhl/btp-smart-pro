-- ============================================
-- CRÉATION TABLE NOTIFICATIONS
-- ============================================
-- Ce script crée la table notifications et les politiques RLS
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Créer la table notifications
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, urgent, success, error
  related_table TEXT, -- 'projects', 'clients', 'maintenance_reminders', etc.
  related_id UUID, -- ID de l'élément lié
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- ÉTAPE 2 : Créer les index
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON public.notifications(related_table, related_id);

-- ============================================
-- ÉTAPE 3 : Activer RLS
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 4 : Supprimer les anciennes politiques
-- ============================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service can create notifications" ON public.notifications;

-- ============================================
-- ÉTAPE 5 : Créer les politiques RLS
-- ============================================

-- Politique 1 : Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Politique 2 : Les utilisateurs peuvent mettre à jour leurs propres notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique 3 : Les utilisateurs peuvent créer leurs propres notifications
CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique 4 : Les utilisateurs peuvent supprimer leurs propres notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Politique 5 : Le service role peut créer des notifications pour tous les utilisateurs
-- (pour les notifications automatiques via triggers)
CREATE POLICY "Service can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- ============================================
-- ÉTAPE 6 : Créer la fonction pour créer des notifications
-- ============================================

-- Fonction pour créer une notification (utilisée par les triggers)
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
    '✅ RLS Policies créées' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- Afficher les politiques créées
SELECT 
    'Politiques créées' as info,
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

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
-- La table notifications permet de :
-- 1. Stocker les notifications pour les utilisateurs
-- 2. Marquer les notifications comme lues
-- 3. Lier les notifications à des éléments (projets, clients, etc.)
-- 4. Créer des notifications automatiques via des triggers
-- ============================================

