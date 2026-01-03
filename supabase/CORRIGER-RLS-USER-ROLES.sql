-- =====================================================
-- 🔧 CORRIGER RLS POUR user_roles
-- =====================================================
-- Ce script corrige les RLS policies pour permettre
-- la lecture des rôles utilisateur
-- =====================================================

-- Vérifier que la table existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
  ) THEN
    RAISE EXCEPTION 'La table user_roles n''existe pas. Exécutez d''abord SCRIPT-COMPLET-TOUT-CREER.sql';
  END IF;
END $$;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their own roles" ON public.user_roles;

-- Policy 1 : Permettre à tous les utilisateurs authentifiés de voir leur propre rôle
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2 : Permettre aux admins de tout gérer
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Policy 3 : Permettre à n'importe qui de créer son propre rôle (pour le premier admin)
-- Cette policy est temporaire et permet la création initiale
CREATE POLICY "Users can create their own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Vérification
SELECT 
  '✅ RLS policies corrigées pour user_roles' as status,
  COUNT(*) as nombre_policies
FROM pg_policies 
WHERE tablename = 'user_roles';















