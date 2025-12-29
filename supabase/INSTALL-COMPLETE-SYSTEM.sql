-- =====================================================
-- 🚀 INSTALLATION COMPLÈTE DU SYSTÈME
-- =====================================================
-- Script unique pour créer TOUT le système d'un coup
-- 
-- ✅ Ce script crée :
--   - Table companies
--   - Table company_users
--   - Table invitations
--   - Table contact_requests
--   - Ajoute company_id aux tables existantes
--   - Configure toutes les RLS policies
--   - Crée toutes les fonctions SQL
--   - Crée tous les triggers
--
-- 📋 INSTRUCTIONS :
--   1. Ouvrez Supabase Dashboard → SQL Editor
--   2. Copiez TOUT ce script
--   3. Collez dans l'éditeur SQL
--   4. Cliquez sur "Run" ou appuyez sur Cmd/Ctrl + Enter
--   5. Attendez le message "✅ Système complet créé avec succès !"
-- =====================================================

-- =====================================================
-- PARTIE 1 : TABLE companies
-- =====================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'custom' CHECK (plan IN ('basic', 'pro', 'enterprise', 'custom')),
  features JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  support_level INTEGER DEFAULT 0 CHECK (support_level IN (0, 1, 2)),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'no_support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

-- =====================================================
-- PARTIE 2 : TABLE company_users
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users(role);

-- =====================================================
-- PARTIE 3 : TABLE invitations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON public.invitations(user_id);

-- =====================================================
-- PARTIE 4 : TABLE contact_requests
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  entreprise TEXT,
  message TEXT,
  request_type TEXT DEFAULT 'essai_gratuit' CHECK (request_type IN ('essai_gratuit', 'contact', 'information')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'invited', 'rejected')),
  trial_requested BOOLEAN DEFAULT false,
  admin_notes TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON public.contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_requests_request_type ON public.contact_requests(request_type);

-- =====================================================
-- PARTIE 5 : AJOUTER company_id AUX TABLES EXISTANTES
-- =====================================================

DO $$ 
BEGIN
  -- clients
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
  END IF;

  -- projects
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
  END IF;

  -- invoices
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
  END IF;

  -- ai_quotes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_ai_quotes_company_id ON public.ai_quotes(company_id);
  END IF;

  -- employees
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
  END IF;

  -- candidatures
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'candidatures'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'candidatures' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.candidatures ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_candidatures_company_id ON public.candidatures(company_id);
  END IF;

  -- taches_rh
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'taches_rh'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'taches_rh' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.taches_rh ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_taches_rh_company_id ON public.taches_rh(company_id);
  END IF;

  -- user_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_user_settings_company_id ON public.user_settings(company_id);
  END IF;
END $$;

-- =====================================================
-- PARTIE 6 : ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
CREATE POLICY "Users can view their company"
  ON public.companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Company Users
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company_users" ON public.company_users;
CREATE POLICY "Users can view their company_users"
  ON public.company_users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage company_users" ON public.company_users;
CREATE POLICY "Admins can manage company_users"
  ON public.company_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_users.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;
CREATE POLICY "Users can view their own invitations"
  ON public.invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

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
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

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

-- Contact Requests
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;
CREATE POLICY "Admins can view all contact requests"
  ON public.contact_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

DROP POLICY IF EXISTS "Admins can update contact requests" ON public.contact_requests;
CREATE POLICY "Admins can update contact requests"
  ON public.contact_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- PARTIE 7 : FONCTIONS SQL
-- =====================================================

-- Fonction: Accepter une invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expirée';
  END IF;

  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'L''email ne correspond pas à l''invitation';
  END IF;

  INSERT INTO public.company_users (company_id, user_id, role)
  VALUES (v_invitation.company_id, p_user_id, v_invitation.role)
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET role = v_invitation.role;

  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      user_id = p_user_id
  WHERE id = v_invitation.id;

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

-- Fonction: Vérifier si un email a une invitation valide
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

-- Fonction: Créer une demande de contact
CREATE OR REPLACE FUNCTION create_contact_request(
  p_nom TEXT,
  p_prenom TEXT,
  p_email TEXT,
  p_telephone TEXT DEFAULT NULL,
  p_entreprise TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_request_type TEXT DEFAULT 'essai_gratuit',
  p_trial_requested BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
BEGIN
  INSERT INTO public.contact_requests (
    nom, prenom, email, telephone, entreprise, message,
    request_type, trial_requested
  )
  VALUES (
    p_nom, p_prenom, p_email, p_telephone, p_entreprise, p_message,
    p_request_type, p_trial_requested
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Obtenir la company_id d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_company_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.company_users
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier si une feature est activée
CREATE OR REPLACE FUNCTION is_feature_enabled(p_company_id UUID, p_feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_features JSONB;
BEGIN
  SELECT features INTO v_features
  FROM public.companies
  WHERE id = p_company_id;
  
  RETURN COALESCE((v_features->>p_feature_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Obtenir le niveau de support
CREATE OR REPLACE FUNCTION get_support_level(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_support_level INTEGER;
BEGIN
  SELECT support_level INTO v_support_level
  FROM public.companies
  WHERE id = p_company_id;
  
  RETURN COALESCE(v_support_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTIE 8 : TRIGGERS
-- =====================================================

-- Trigger pour updated_at sur companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Trigger pour updated_at sur invitations
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

-- Trigger pour updated_at sur contact_requests
CREATE OR REPLACE FUNCTION update_contact_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contact_requests_updated_at ON public.contact_requests;
CREATE TRIGGER trigger_update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_requests_updated_at();

-- =====================================================
-- PARTIE 9 : MISE À JOUR DES RLS POLICIES POUR ISOLATION PAR ENTREPRISE
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
-- FIN DU SCRIPT - MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ =========================================';
  RAISE NOTICE '✅ SYSTÈME COMPLET INSTALLÉ AVEC SUCCÈS !';
  RAISE NOTICE '✅ =========================================';
  RAISE NOTICE '✅ Tables créées: companies, company_users, invitations, contact_requests';
  RAISE NOTICE '✅ Colonnes company_id ajoutées aux tables existantes';
  RAISE NOTICE '✅ RLS policies configurées';
  RAISE NOTICE '✅ Fonctions SQL créées: accept_invitation, has_valid_invitation, create_contact_request';
  RAISE NOTICE '✅ Triggers configurés';
  RAISE NOTICE '✅ Isolation par entreprise activée';
  RAISE NOTICE '✅ =========================================';
END $$;














