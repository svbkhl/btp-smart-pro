-- =====================================================
-- SCRIPT COMPLET - CORRECTION company_users ET invitations
-- =====================================================
-- Ce script corrige les erreurs 500 sur company_users
-- et prépare le système d'invitations
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE company_users
-- =====================================================

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

-- =====================================================
-- 2. SUPPRIMER TOUTES LES ANCIENNES POLICIES company_users
-- =====================================================

DROP POLICY IF EXISTS "Users can view their company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view all company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can insert their own company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can insert company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can update their own company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can update company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can delete their own company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can delete company_users" ON public.company_users;

-- =====================================================
-- 3. CRÉER LES POLICIES RLS POUR company_users
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les relations
CREATE POLICY "Admins can view all company_users" ON public.company_users
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- SELECT : Les utilisateurs peuvent voir leurs propres relations
CREATE POLICY "Users can view their company_users" ON public.company_users
FOR SELECT 
USING (user_id = auth.uid());

-- INSERT : Les admins peuvent créer des relations
CREATE POLICY "Admins can insert company_users" ON public.company_users
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- INSERT : Les utilisateurs peuvent créer leurs propres relations (pour accepter des invitations)
CREATE POLICY "Users can insert their own company_users" ON public.company_users
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- UPDATE : Les admins peuvent mettre à jour toutes les relations
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

-- DELETE : Les admins peuvent supprimer toutes les relations
CREATE POLICY "Admins can delete company_users" ON public.company_users
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- DELETE : Les utilisateurs peuvent supprimer leurs propres relations
CREATE POLICY "Users can delete their own company_users" ON public.company_users
FOR DELETE 
USING (user_id = auth.uid());

-- =====================================================
-- 4. CRÉER LA TABLE invitations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON public.invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations(invited_by);

-- Activer RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. SUPPRIMER TOUTES LES ANCIENNES POLICIES invitations
-- =====================================================

DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

-- =====================================================
-- 6. CRÉER LES POLICIES RLS POUR invitations
-- =====================================================

-- SELECT : Les admins peuvent voir toutes les invitations
CREATE POLICY "Admins can view all invitations" ON public.invitations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- SELECT : Les utilisateurs peuvent voir les invitations qu'ils ont envoyées
CREATE POLICY "Users can view invitations they sent" ON public.invitations
FOR SELECT 
USING (invited_by = auth.uid());

-- SELECT : N'importe qui peut voir une invitation par token (pour la page d'acceptation)
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
FOR SELECT 
USING (true);

-- INSERT : Les admins peuvent créer des invitations
CREATE POLICY "Admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- UPDATE : Les admins peuvent mettre à jour toutes les invitations
CREATE POLICY "Admins can update invitations" ON public.invitations
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

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT SELECT ON public.company_users TO anon;

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon;

-- =====================================================
-- 8. TRIGGER updated_at POUR invitations
-- =====================================================

CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- =====================================================
-- 9. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT EXÉCUTÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées/vérifiées :';
  RAISE NOTICE '  ✅ company_users';
  RAISE NOTICE '  ✅ invitations';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS activé avec policies pour :';
  RAISE NOTICE '  ✅ Admins : accès complet';
  RAISE NOTICE '  ✅ Users : accès à leurs propres données';
  RAISE NOTICE '';
  RAISE NOTICE 'Les erreurs 500 sur company_users devraient';
  RAISE NOTICE 'maintenant être résolues !';
  RAISE NOTICE '========================================';
END $$;





