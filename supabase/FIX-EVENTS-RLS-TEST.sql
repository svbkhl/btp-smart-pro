-- =====================================================
-- CONFIGURATION RLS POUR EVENTS - VERSION TEST
-- =====================================================
-- ⚠️ Ce script crée une politique moins restrictive pour les tests
-- mais toujours sécurisée (vérifie l'authentification)
-- =====================================================

-- 1. Activer RLS sur la table events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.events;
DROP POLICY IF EXISTS "Allow all inserts" ON public.events;

-- 3. Créer les politiques RLS

-- SELECT : Les utilisateurs peuvent voir leurs propres événements
CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT : Version TEST - Autorise les inserts pour utilisateurs authentifiés
-- ⚠️ SÉCURITÉ : Vérifie que l'utilisateur est authentifié
-- ⚠️ NOTE : Si user_id n'est pas fourni, il sera NULL et la politique échouera
-- Pour que ça fonctionne, le frontend DOIT fournir user_id = auth.uid()
CREATE POLICY "Allow authenticated users to insert events"
ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- Soit user_id correspond à l'utilisateur connecté
    user_id = auth.uid()
    -- Soit user_id n'est pas fourni (sera défini automatiquement par un trigger)
    -- Dans ce cas, on autorise si l'utilisateur est authentifié
    OR user_id IS NULL
  )
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
-- OPTIONNEL : Trigger pour définir automatiquement user_id
-- =====================================================
-- Si vous voulez que user_id soit défini automatiquement lors de l'insertion
-- même si le frontend ne le fournit pas :

CREATE OR REPLACE FUNCTION public.set_event_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si user_id n'est pas fourni, utiliser l'ID de l'utilisateur authentifié
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_event_user_id ON public.events;
CREATE TRIGGER trigger_set_event_user_id
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_user_id();

-- =====================================================
-- VÉRIFICATION
-- =====================================================
-- Pour vérifier que les politiques sont bien créées :
-- SELECT schemaname, tablename, policyname, cmd, with_check
-- FROM pg_policies 
-- WHERE tablename = 'events';





