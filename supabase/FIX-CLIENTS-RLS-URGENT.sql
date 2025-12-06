-- =====================================================
-- CORRECTION URGENTE - POLICIES RLS POUR CLIENTS
-- =====================================================
-- Ce script corrige les policies RLS pour permettre
-- la création et la modification de clients
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER QUE LA TABLE EXISTE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clients'
  ) THEN
    RAISE EXCEPTION 'Table clients does not exist. Run FIX-CLIENTS-TABLE.sql first.';
  END IF;
END $$;

-- =====================================================
-- 2. ACTIVER RLS (si pas déjà activé)
-- =====================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. SUPPRIMER TOUTES LES ANCIENNES POLICIES
-- =====================================================

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

-- =====================================================
-- 4. CRÉER LES POLICIES RLS CORRECTES
-- =====================================================

-- SELECT : Les utilisateurs peuvent voir leurs propres clients
CREATE POLICY "Users can view their own clients"
ON public.clients
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT : Les utilisateurs peuvent créer leurs propres clients
-- IMPORTANT : WITH CHECK vérifie que user_id = auth.uid() dans les données insérées
CREATE POLICY "Users can create their own clients"
ON public.clients
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE : Les utilisateurs peuvent modifier leurs propres clients
CREATE POLICY "Users can update their own clients"
ON public.clients
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE : Les utilisateurs peuvent supprimer leurs propres clients
CREATE POLICY "Users can delete their own clients"
ON public.clients
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 5. VÉRIFIER QUE LES POLICIES SONT CRÉÉES
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'clients';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Not all policies were created. Expected 4, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✅ % policies created for clients table', policy_count;
END $$;

-- =====================================================
-- 6. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ POLICIES RLS CLIENTS CORRIGÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies créées :';
  RAISE NOTICE '  ✅ SELECT : Users can view their own clients';
  RAISE NOTICE '  ✅ INSERT : Users can create their own clients';
  RAISE NOTICE '  ✅ UPDATE : Users can update their own clients';
  RAISE NOTICE '  ✅ DELETE : Users can delete their own clients';
  RAISE NOTICE '';
  RAISE NOTICE 'La création de clients devrait maintenant fonctionner !';
  RAISE NOTICE '========================================';
END $$;




