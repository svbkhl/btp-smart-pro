-- =====================================================
-- FIX RLS EVENTS - VERSION DÉFINITIVE
-- =====================================================
-- ⚠️ EXÉCUTEZ CE SCRIPT DANS L'ÉDITEUR SQL DE SUPABASE
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- 1. Activer RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les politiques existantes (méthode robuste)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'events'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', r.policyname);
    END LOOP;
END $$;

-- 3. Créer un trigger pour définir automatiquement user_id
-- Ce trigger s'exécute AVANT l'insertion et définit toujours user_id = auth.uid()
CREATE OR REPLACE FUNCTION public.set_event_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Toujours définir user_id à partir de l'utilisateur authentifié
  -- Même si le frontend l'a fourni, on le redéfinit pour garantir la sécurité
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_set_event_user_id ON public.events;

-- Créer le trigger
CREATE TRIGGER trigger_set_event_user_id
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_user_id();

-- 4. Créer une politique INSERT très permissive
-- Elle autorise TOUS les inserts pour les utilisateurs authentifiés
-- Le trigger définira automatiquement le user_id correct
CREATE POLICY "Allow authenticated users to insert events"
ON public.events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Créer les autres politiques
CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
ON public.events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
ON public.events
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- VÉRIFICATION
-- =====================================================
-- Vérifier les politiques :
SELECT schemaname, tablename, policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Vérifier le trigger :
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'events';

-- Vérifier que RLS est activé :
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'events';





