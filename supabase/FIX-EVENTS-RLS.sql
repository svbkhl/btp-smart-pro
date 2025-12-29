-- =====================================================
-- CORRECTION DES POLITIQUES RLS POUR LA TABLE EVENTS
-- =====================================================
-- Ce script supprime et recrée les politiques RLS
-- pour garantir qu'elles fonctionnent correctement
-- =====================================================

-- S'assurer que RLS est activé
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes pour events
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;

-- Recréer les politiques RLS pour events

-- 1. SELECT : Les utilisateurs peuvent voir leurs propres événements
CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() = user_id);

-- 2. INSERT : Les utilisateurs peuvent créer leurs propres événements
-- IMPORTANT : WITH CHECK vérifie que user_id = auth.uid() dans les données insérées
CREATE POLICY "Users can insert their own events"
ON public.events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE : Les utilisateurs peuvent mettre à jour leurs propres événements
CREATE POLICY "Users can update their own events"
ON public.events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE : Les utilisateurs peuvent supprimer leurs propres événements
CREATE POLICY "Users can delete their own events"
ON public.events
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- VÉRIFICATION
-- =====================================================
-- Pour vérifier que les politiques sont bien créées :
-- SELECT * FROM pg_policies WHERE tablename = 'events';





