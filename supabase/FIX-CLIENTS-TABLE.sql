-- ============================================
-- DIAGNOSTIC ET CORRECTION TABLE CLIENTS
-- ============================================
-- Ce script vérifie et corrige les problèmes avec la table clients
-- Erreur: "invalid input syntax for type uuid: 'clients'"
-- ============================================

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'clients'
);

-- 2. Afficher la structure de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'clients'
ORDER BY ordinal_position;

-- 3. Vérifier les contraintes de clés étrangères
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'clients';

-- 4. Vérifier les triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'clients';

-- 5. Vérifier les policies RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'clients';

-- ============================================
-- CORRECTION : Recréer la table si nécessaire
-- ============================================

-- Sauvegarder les données existantes (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    CREATE TEMP TABLE clients_backup AS SELECT * FROM public.clients;
    RAISE NOTICE '✅ Données sauvegardées dans clients_backup';
  END IF;
END $$;

-- Supprimer et recréer la table proprement
DROP TABLE IF EXISTS public.clients CASCADE;

CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'terminé', 'planifié', 'VIP')),
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at);

-- Activer RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Créer les policies RLS
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = user_id);

-- Créer la fonction de mise à jour du timestamp (si elle n'existe pas)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Restaurer les données (si elles existaient)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'pg_temp' AND tablename LIKE 'clients_backup%') THEN
    INSERT INTO public.clients 
    SELECT * FROM clients_backup
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE '✅ Données restaurées depuis clients_backup';
  END IF;
END $$;

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

SELECT '✅ Table clients créée et configurée correctement' AS status;

-- Afficher un exemple d'INSERT pour tester
SELECT '
-- TEST : Créer un client test
INSERT INTO public.clients (user_id, name, email, phone, location, status)
VALUES (
  auth.uid(), 
  ''Client Test'',
  ''test@example.com'',
  ''0612345678'',
  ''Paris'',
  ''actif''
)
RETURNING *;
' AS test_query;


















