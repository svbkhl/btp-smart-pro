-- =====================================================
-- FIX RLS EVENTS - VERSION FINALE ET SIMPLE
-- =====================================================
-- ⚠️ EXÉCUTEZ CE SCRIPT DANS L'ÉDITEUR SQL DE SUPABASE
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- ÉTAPE 1 : Activer RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 2 : Supprimer TOUTES les politiques existantes
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'events'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
    END LOOP;
END $$;

-- ÉTAPE 3 : Créer un trigger pour définir automatiquement user_id
CREATE OR REPLACE FUNCTION public.set_event_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Définir automatiquement user_id = auth.uid()
  -- Cela garantit que chaque événement appartient à l'utilisateur qui le crée
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_event_user_id ON public.events;
CREATE TRIGGER trigger_set_event_user_id
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_user_id();

-- ÉTAPE 4 : Créer la politique INSERT (très permissive pour les utilisateurs authentifiés)
CREATE POLICY "Allow insert for authenticated users"
ON public.events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ÉTAPE 5 : Créer les autres politiques
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
-- Exécutez ces requêtes pour vérifier :

-- 1. Vérifier les politiques
SELECT 
    policyname, 
    cmd, 
    with_check,
    CASE 
        WHEN with_check LIKE '%auth.uid()%' THEN '✅ OK'
        ELSE '❌ Problème'
    END as status
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 2. Vérifier le trigger
SELECT 
    trigger_name,
    event_manipulation,
    CASE 
        WHEN trigger_name = 'trigger_set_event_user_id' THEN '✅ OK'
        ELSE '❌ Manquant'
    END as status
FROM information_schema.triggers
WHERE event_object_table = 'events';

-- 3. Vérifier que RLS est activé
SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS activé'
        ELSE '❌ RLS désactivé'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'events';





