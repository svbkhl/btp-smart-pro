-- =====================================================
-- SCRIPT - CRÉATION TABLE invitations
-- =====================================================
-- Ce script crée la table invitations si elle n'existe pas
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- Créer la table invitations
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations(invited_by);

-- Activer RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

-- Policies RLS
-- Les admins peuvent voir toutes les invitations
CREATE POLICY "Admins can view all invitations" ON public.invitations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Les utilisateurs peuvent voir les invitations qu'ils ont envoyées
CREATE POLICY "Users can view invitations they sent" ON public.invitations
FOR SELECT 
USING (invited_by = auth.uid());

-- Les admins peuvent créer des invitations
CREATE POLICY "Admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Les utilisateurs peuvent mettre à jour les invitations qu'ils ont envoyées
CREATE POLICY "Users can update invitations they sent" ON public.invitations
FOR UPDATE 
USING (invited_by = auth.uid())
WITH CHECK (invited_by = auth.uid());

-- N'importe qui peut voir une invitation par token (pour la page d'acceptation)
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
FOR SELECT 
USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon;

-- Trigger pour updated_at
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

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Table invitations créée avec succès !';
  RAISE NOTICE '   - Colonnes: id, email, company_id, role, invited_by, token, status, expires_at, accepted_at, created_at, updated_at';
  RAISE NOTICE '   - RLS activé avec policies pour admins et utilisateurs';
END $$;













