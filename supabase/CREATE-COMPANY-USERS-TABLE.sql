-- =====================================================
-- SCRIPT - CRÉATION TABLE company_users
-- =====================================================
-- Ce script crée la table company_users si elle n'existe pas
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- Créer la table company_users
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users(role);

-- Activer RLS
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view all company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can insert their own company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can insert company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can update their own company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can update company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can delete their own company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can delete company_users" ON public.company_users;

-- Policies RLS
-- Les admins peuvent voir toutes les relations company_users
CREATE POLICY "Admins can view all company_users" ON public.company_users
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Les utilisateurs peuvent voir leurs propres relations company_users
CREATE POLICY "Users can view their company_users" ON public.company_users
FOR SELECT 
USING (user_id = auth.uid());

-- Les admins peuvent créer des relations company_users
CREATE POLICY "Admins can insert company_users" ON public.company_users
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Les utilisateurs peuvent créer leurs propres relations (pour accepter des invitations)
CREATE POLICY "Users can insert their own company_users" ON public.company_users
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Les admins peuvent mettre à jour toutes les relations
CREATE POLICY "Admins can update company_users" ON public.company_users
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Les utilisateurs peuvent mettre à jour leurs propres relations (limité)
CREATE POLICY "Users can update their own company_users" ON public.company_users
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Les admins peuvent supprimer toutes les relations
CREATE POLICY "Admins can delete company_users" ON public.company_users
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Les utilisateurs peuvent supprimer leurs propres relations (se retirer d'une entreprise)
CREATE POLICY "Users can delete their own company_users" ON public.company_users
FOR DELETE 
USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT SELECT ON public.company_users TO anon;

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Table company_users créée avec succès !';
  RAISE NOTICE '   - Colonnes: id, company_id, user_id, role, created_at';
  RAISE NOTICE '   - Contrainte UNIQUE sur (company_id, user_id)';
  RAISE NOTICE '   - RLS activé avec policies pour admins et utilisateurs';
END $$;





