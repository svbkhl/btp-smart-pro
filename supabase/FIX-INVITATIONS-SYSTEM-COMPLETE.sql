-- =====================================================
-- SCRIPT COMPLET - CORRECTION SYSTÈME INVITATIONS
-- =====================================================
-- Ce script recrée entièrement la table invitations
-- avec les bonnes colonnes, sans ENUM, avec RLS correct
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER L'ANCIENNE TABLE (si elle existe)
-- =====================================================

DROP TABLE IF EXISTS public.invitations CASCADE;

-- =====================================================
-- 2. CRÉER LA TABLE invitations AVEC LES COLONNES EXACTES
-- =====================================================

CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. CRÉER LES INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_user_id ON public.invitations(user_id);
CREATE INDEX idx_invitations_invited_by ON public.invitations(invited_by);
CREATE INDEX idx_invitations_email_company ON public.invitations(email, company_id);

-- =====================================================
-- 4. ACTIVER RLS
-- =====================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. SUPPRIMER TOUTES LES ANCIENNES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can update invitations" ON public.invitations;

-- =====================================================
-- 6. CRÉER LES POLICIES RLS
-- =====================================================

-- SELECT : Les admins globaux peuvent voir toutes les invitations
CREATE POLICY "Admins can view all invitations" ON public.invitations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- SELECT : Les admins/owners de company peuvent voir les invitations de leur company
CREATE POLICY "Company admins can view invitations" ON public.invitations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
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

-- INSERT : Les admins globaux peuvent créer des invitations
CREATE POLICY "Admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- INSERT : Les admins/owners de company peuvent créer des invitations pour leur company
CREATE POLICY "Company admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
);

-- UPDATE : Les admins globaux peuvent mettre à jour toutes les invitations
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

-- UPDATE : Les admins/owners de company peuvent mettre à jour les invitations de leur company
CREATE POLICY "Company admins can update invitations" ON public.invitations
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = invitations.company_id
      AND role IN ('owner', 'admin')
  )
);

-- =====================================================
-- 7. TRIGGER updated_at
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
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon;

-- =====================================================
-- 9. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SYSTÈME INVITATIONS RECONSTRUIT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table créée :';
  RAISE NOTICE '  ✅ invitations';
  RAISE NOTICE '    - id (UUID, PRIMARY KEY)';
  RAISE NOTICE '    - email (TEXT, NOT NULL)';
  RAISE NOTICE '    - company_id (UUID, FK → companies)';
  RAISE NOTICE '    - role (TEXT, owner/admin/member)';
  RAISE NOTICE '    - invited_by (UUID, FK → auth.users)';
  RAISE NOTICE '    - token (TEXT, UNIQUE)';
  RAISE NOTICE '    - status (TEXT, pending/accepted/expired/cancelled)';
  RAISE NOTICE '    - expires_at, accepted_at, user_id';
  RAISE NOTICE '    - created_at, updated_at';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS activé avec policies pour :';
  RAISE NOTICE '  ✅ Admins globaux : accès complet';
  RAISE NOTICE '  ✅ Admins/Owners de company : gestion de leur company';
  RAISE NOTICE '  ✅ Utilisateurs : voir leurs invitations envoyées';
  RAISE NOTICE '  ✅ Public : voir invitation par token';
  RAISE NOTICE '';
  RAISE NOTICE 'Le système est prêt !';
  RAISE NOTICE '========================================';
END $$;





