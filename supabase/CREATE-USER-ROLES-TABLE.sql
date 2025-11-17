-- Script simple pour créer uniquement la table user_roles
-- À exécuter dans Supabase Dashboard → SQL Editor

-- Créer la table user_roles si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'salarie' CHECK (role IN ('dirigeant', 'salarie', 'administrateur')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Activer RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- Politique : Les utilisateurs peuvent voir leur propre rôle
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Politique : Les admins peuvent voir tous les rôles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrateur'
  )
);

-- Politique : Les utilisateurs peuvent insérer leur propre rôle
CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique : Les admins peuvent mettre à jour les rôles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrateur'
  )
);

-- Créer le trigger pour updated_at si la fonction existe déjà
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
    CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON public.user_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Table user_roles créée avec succès !';
  RAISE NOTICE '📋 Vous pouvez maintenant insérer un rôle pour votre utilisateur :';
  RAISE NOTICE '   INSERT INTO public.user_roles (user_id, role) VALUES (''VOTRE_USER_ID'', ''administrateur'');';
END $$;

