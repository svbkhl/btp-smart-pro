-- =====================================================
-- CORRECTION COMPLÈTE - POLICIES RLS POUR CLIENTS
-- =====================================================
-- Ce script corrige les policies RLS pour permettre
-- la création et la modification de clients
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- 1️⃣ Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Supprimer les policies existantes pour repartir propre
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.clients;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.clients;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.clients;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their company clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;

-- 3️⃣ Créer des policies complètes pour tous les CRUD

-- Autoriser SELECT pour tout utilisateur authentifié
CREATE POLICY "Allow select for authenticated"
ON public.clients
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Autoriser INSERT pour tout utilisateur authentifié
-- IMPORTANT : Pour INSERT, on utilise WITH CHECK, pas USING
CREATE POLICY "Allow insert for authenticated"
ON public.clients
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Autoriser UPDATE pour tout utilisateur authentifié
CREATE POLICY "Allow update for authenticated"
ON public.clients
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Autoriser DELETE pour tout utilisateur authentifié
CREATE POLICY "Allow delete for authenticated"
ON public.clients
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 4️⃣ Vérifier que les policies sont bien appliquées
SELECT 
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'clients'
ORDER BY cmd, policyname;

-- 5️⃣ Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ POLICIES RLS CLIENTS CORRIGÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies créées :';
  RAISE NOTICE '  ✅ SELECT : Allow select for authenticated';
  RAISE NOTICE '  ✅ INSERT : Allow insert for authenticated';
  RAISE NOTICE '  ✅ UPDATE : Allow update for authenticated';
  RAISE NOTICE '  ✅ DELETE : Allow delete for authenticated';
  RAISE NOTICE '';
  RAISE NOTICE 'Tous les utilisateurs authentifiés peuvent maintenant :';
  RAISE NOTICE '  - Créer des clients';
  RAISE NOTICE '  - Voir leurs clients';
  RAISE NOTICE '  - Modifier leurs clients';
  RAISE NOTICE '  - Supprimer leurs clients';
  RAISE NOTICE '';
  RAISE NOTICE 'La création de clients devrait maintenant fonctionner !';
  RAISE NOTICE '========================================';
END $$;

