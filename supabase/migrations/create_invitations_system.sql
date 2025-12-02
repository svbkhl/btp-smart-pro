-- =====================================================
-- SYSTÈME D'INVITATIONS MULTI-ENTREPRISES
-- =====================================================
-- Ce script crée le système d'invitation pour les entreprises
-- Seules les personnes invitées peuvent créer un compte
-- 
-- ⚠️ IMPORTANT : Exécutez d'abord CREATE-COMPANIES-SYSTEM.sql
-- pour créer la table companies avant d'exécuter ce script
-- =====================================================

-- =====================================================
-- 0. VÉRIFIER QUE LA TABLE companies EXISTE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'companies'
  ) THEN
    RAISE EXCEPTION 'La table companies n''existe pas. Veuillez d''abord exécuter le script CREATE-COMPANIES-SYSTEM.sql';
  END IF;
END $$;

-- =====================================================
-- 1. TABLE: invitations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- Token unique pour l'invitation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Lien vers l'utilisateur après acceptation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON public.invitations(user_id);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Les admins peuvent voir toutes les invitations
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
CREATE POLICY "Admins can view all invitations"
  ON public.invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Policy: Les dirigeants peuvent voir les invitations de leur entreprise
DROP POLICY IF EXISTS "Owners can view their company invitations" ON public.invitations;
CREATE POLICY "Owners can view their company invitations"
  ON public.invitations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Les utilisateurs peuvent voir leurs propres invitations (par email)
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;
CREATE POLICY "Users can view their own invitations"
  ON public.invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Policy: Seuls les admins et dirigeants peuvent créer des invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    -- Les dirigeants peuvent inviter dans leur entreprise
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Les admins et dirigeants peuvent mettre à jour les invitations
DROP POLICY IF EXISTS "Admins and owners can update invitations" ON public.invitations;
CREATE POLICY "Admins and owners can update invitations"
  ON public.invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 3. FONCTION: Accepter une invitation
-- =====================================================

CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
  v_company_id UUID;
BEGIN
  -- Récupérer l'invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expirée';
  END IF;

  -- Vérifier que l'email correspond
  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'L''email ne correspond pas à l''invitation';
  END IF;

  -- Assigner l'utilisateur à l'entreprise
  INSERT INTO public.company_users (company_id, user_id, role)
  VALUES (v_invitation.company_id, p_user_id, v_invitation.role)
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET role = v_invitation.role;

  -- Mettre à jour l'invitation
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      user_id = p_user_id
  WHERE id = v_invitation.id;

  -- Assigner le rôle dans user_roles
  IF v_invitation.role = 'owner' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'dirigeant')
    ON CONFLICT (user_id) DO UPDATE SET role = 'dirigeant';
  ELSIF v_invitation.role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'administrateur')
    ON CONFLICT (user_id) DO UPDATE SET role = 'administrateur';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'salarie')
    ON CONFLICT (user_id) DO UPDATE SET role = 'salarie';
  END IF;

  RETURN v_invitation.company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FONCTION: Vérifier si un email a une invitation valide
-- =====================================================

CREATE OR REPLACE FUNCTION has_valid_invitation(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invitations
    WHERE email = p_email
      AND status = 'pending'
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGER: Mettre à jour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invitations_updated_at ON public.invitations;
CREATE TRIGGER trigger_update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- =====================================================
-- 6. MISE À JOUR DES RLS POLICIES POUR ISOLATION PAR ENTREPRISE
-- =====================================================

-- Clients
DROP POLICY IF EXISTS "Users can view their company clients" ON public.clients;
CREATE POLICY "Users can view their company clients"
  ON public.clients FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    (company_id IS NULL AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create their company clients" ON public.clients;
CREATE POLICY "Users can create their company clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    (company_id IS NULL AND user_id = auth.uid())
  );

-- Projects
DROP POLICY IF EXISTS "Users can view their company projects" ON public.projects;
CREATE POLICY "Users can view their company projects"
  ON public.projects FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    (company_id IS NULL AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create their company projects" ON public.projects;
CREATE POLICY "Users can create their company projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    (company_id IS NULL AND user_id = auth.uid())
  );

-- Invoices
DROP POLICY IF EXISTS "Users can view their company invoices" ON public.invoices;
CREATE POLICY "Users can view their company invoices"
  ON public.invoices FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    (company_id IS NULL AND user_id = auth.uid())
  );

-- AI Quotes
DROP POLICY IF EXISTS "Users can view their company quotes" ON public.ai_quotes;
CREATE POLICY "Users can view their company quotes"
  ON public.ai_quotes FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    (company_id IS NULL AND user_id = auth.uid())
  );

-- Employees
DROP POLICY IF EXISTS "Users can view their company employees" ON public.employees;
CREATE POLICY "Users can view their company employees"
  ON public.employees FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    (company_id IS NULL AND user_id = auth.uid())
  );

-- =====================================================
-- 7. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE public.invitations IS 'Système d''invitation pour les entreprises - Seules les personnes invitées peuvent créer un compte';
COMMENT ON COLUMN public.invitations.token IS 'Token unique pour l''invitation (généré automatiquement)';
COMMENT ON COLUMN public.invitations.status IS 'Statut: pending, accepted, expired, cancelled';
COMMENT ON FUNCTION accept_invitation(TEXT, UUID) IS 'Accepte une invitation et assigne l''utilisateur à l''entreprise';
COMMENT ON FUNCTION has_valid_invitation(TEXT) IS 'Vérifie si un email a une invitation valide';

