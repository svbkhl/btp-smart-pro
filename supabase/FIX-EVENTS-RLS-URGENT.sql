-- =====================================================
-- CORRECTION URGENTE DES POLITIQUES RLS POUR EVENTS
-- =====================================================
-- À exécuter dans l'éditeur SQL de Supabase
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.events;

-- 3. Recréer les politiques RLS correctement

-- SELECT : Les utilisateurs peuvent voir leurs propres événements
CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT : Les utilisateurs authentifiés peuvent créer des événements
-- IMPORTANT : WITH CHECK vérifie que user_id dans les données = auth.uid()
CREATE POLICY "Users can insert their own events"
ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- UPDATE : Les utilisateurs peuvent mettre à jour leurs propres événements
CREATE POLICY "Users can update their own events"
ON public.events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE : Les utilisateurs peuvent supprimer leurs propres événements
CREATE POLICY "Users can delete their own events"
ON public.events
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- VÉRIFICATION
-- =====================================================
-- Pour vérifier que les politiques sont bien créées :
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'events';





