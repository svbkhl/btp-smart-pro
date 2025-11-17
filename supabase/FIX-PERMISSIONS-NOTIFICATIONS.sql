-- ============================================
-- CORRECTION : Permissions Notifications
-- ============================================
-- Ce script corrige les problèmes de permissions pour la table notifications
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Vérifier que la table existe
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
        RAISE EXCEPTION '❌ La table "notifications" n''existe pas. Exécutez d''abord CRÉER-NOTIFICATIONS-MINIMAL.sql';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : Vérifier que RLS est activé
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 3 : Supprimer TOUTES les anciennes politiques
-- ============================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notifications;

-- ============================================
-- ÉTAPE 4 : Créer les politiques RLS CORRECTES
-- ============================================

-- Politique 1 : SELECT - Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Politique 2 : INSERT - Les utilisateurs peuvent créer leurs propres notifications
CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politique 3 : UPDATE - Les utilisateurs peuvent mettre à jour leurs propres notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique 4 : DELETE - Les utilisateurs peuvent supprimer leurs propres notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- ÉTAPE 5 : Créer la fonction create_notification (si elle n'existe pas)
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
-- ÉTAPE 6 : Donner les permissions à la fonction
-- ============================================

-- La fonction create_notification utilise SECURITY DEFINER
-- Elle peut créer des notifications pour n'importe quel utilisateur
-- Cela permet aux triggers de créer des notifications automatiquement

-- ============================================
-- ÉTAPE 7 : Vérification finale
-- ============================================

-- Vérifier que la table existe
SELECT 
    '✅ Table notifications' as status,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications';

-- Vérifier que RLS est activé
SELECT 
    '✅ RLS activé' as status,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- Vérifier les politiques
SELECT 
    '✅ Politiques RLS' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- Afficher les politiques créées
SELECT 
    'Politiques créées' as info,
    policyname as nom,
    cmd as operation,
    roles as roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications'
ORDER BY policyname;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- column_count: 9
-- rls_enabled: true
-- policy_count: 4
-- ============================================

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
-- Les politiques RLS permettent :
-- 1. SELECT : Les utilisateurs peuvent voir leurs propres notifications
-- 2. INSERT : Les utilisateurs peuvent créer leurs propres notifications
-- 3. UPDATE : Les utilisateurs peuvent mettre à jour leurs propres notifications
-- 4. DELETE : Les utilisateurs peuvent supprimer leurs propres notifications
-- 
-- La fonction create_notification() utilise SECURITY DEFINER
-- Elle peut créer des notifications pour n'importe quel utilisateur
-- Cela permet aux triggers de créer des notifications automatiquement
-- ============================================

