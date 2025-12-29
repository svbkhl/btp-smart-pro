-- =====================================================
-- CORRECTION RLS POUR EVENTS - POLITIQUE SÉCURISÉE
-- =====================================================
-- ⚠️ IMPORTANT : Ce script doit être exécuté dans l'éditeur SQL de Supabase
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- 1. Activer RLS sur la table events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.events;

-- 3. Créer les politiques RLS sécurisées

-- SELECT : Les utilisateurs peuvent voir leurs propres événements
CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT : Les utilisateurs authentifiés peuvent créer des événements
-- SÉCURITÉ : Vérifie que l'utilisateur est authentifié ET que user_id = auth.uid()
-- Cela empêche un utilisateur de créer des événements pour d'autres utilisateurs
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





