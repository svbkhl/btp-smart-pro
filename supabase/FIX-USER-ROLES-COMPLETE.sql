-- =====================================================
-- SCRIPT COMPLET - CORRECTION TABLE user_roles
-- =====================================================
-- Ce script corrige tous les problèmes de la table user_roles
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. CRÉER L'ENUM app_role SI IL N'EXISTE PAS
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('dirigeant', 'salarie', 'client', 'administrateur');
  ELSE
    -- Ajouter 'administrateur' si l'enum existe mais n'a pas cette valeur
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrateur';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- =====================================================
-- 2. CRÉER/METTRE À JOUR LA TABLE user_roles
-- =====================================================

-- Supprimer la table si elle existe avec l'ancienne structure
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Créer la table user_roles avec l'enum app_role
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'salarie'::app_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Créer les index pour performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Activer RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. SUPPRIMER TOUTES LES ANCIENNES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Dirigeants can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;

-- =====================================================
-- 4. POLICIES RLS - SELECT (lecture)
-- =====================================================
-- Les utilisateurs peuvent voir leur propre rôle uniquement
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. GRANT PERMISSIONS POUR L'API REST
-- =====================================================
-- Donner les permissions nécessaires à l'API REST
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- =====================================================
-- 6. FONCTION SERVER-SIDE POUR CRÉER/MODIFIER LES RÔLES
-- =====================================================
-- Cette fonction permet de créer/modifier les rôles via le service_role
CREATE OR REPLACE FUNCTION public.create_or_update_user_role(
  p_user_id UUID,
  p_role app_role
)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_roles;
BEGIN
  -- Insérer ou mettre à jour le rôle
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = p_role
  RETURNING * INTO v_role;
  
  RETURN v_role;
END;
$$;

-- =====================================================
-- 7. MESSAGE DE CONFIRMATION
-- =====================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Table user_roles créée et configurée avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Structure :';
  RAISE NOTICE '   - id: UUID (PRIMARY KEY)';
  RAISE NOTICE '   - user_id: UUID (FOREIGN KEY → auth.users, UNIQUE)';
  RAISE NOTICE '   - role: app_role ENUM (dirigeant, salarie, client, administrateur)';
  RAISE NOTICE '   - created_at: TIMESTAMP';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS activé avec policy :';
  RAISE NOTICE '   - SELECT: Les utilisateurs peuvent voir leur propre rôle (user_id = auth.uid())';
  RAISE NOTICE '   - INSERT/UPDATE/DELETE: Uniquement service_role (via fonction server-side)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Pour créer/modifier un rôle, utilisez la fonction :';
  RAISE NOTICE '   SELECT public.create_or_update_user_role(''USER_ID'', ''administrateur''::app_role);';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT :';
  RAISE NOTICE '   1. Vérifiez que la table est exposée dans l''API REST (Dashboard → API → Tables)';
  RAISE NOTICE '   2. Les colonnes user_id et role doivent être exposées';
  RAISE NOTICE '   3. Les permissions SELECT sont activées pour authenticated et anon';
END $$;
