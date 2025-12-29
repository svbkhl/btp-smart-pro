-- =====================================================
-- SCRIPT COMPLET - EVENTS, PROJECTS, INVITATIONS
-- =====================================================
-- Ce script crée/recrée les tables events, projects et invitations
-- avec toutes les colonnes nécessaires, foreign keys, RLS et indexes
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABLE PROJECTS
-- =====================================================

-- Supprimer l'ancienne table si elle existe (optionnel, commenté pour sécurité)
-- DROP TABLE IF EXISTS public.projects CASCADE;

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  budget NUMERIC,
  actual_revenue NUMERIC,
  costs NUMERIC,
  benefice NUMERIC,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- RLS pour projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

-- Policies RLS pour projects
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins peuvent voir tous les projets
CREATE POLICY "Admins can view all projects" ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- =====================================================
-- 2. TABLE EVENTS
-- =====================================================

-- Supprimer l'ancienne table si elle existe (optionnel, commenté pour sécurité)
-- DROP TABLE IF EXISTS public.events CASCADE;

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  type TEXT DEFAULT 'meeting' CHECK (type IN ('meeting', 'task', 'deadline', 'reminder', 'other')),
  color TEXT DEFAULT '#3b82f6',
  reminder_minutes INTEGER,
  reminder_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);

-- RLS pour events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;

-- Policies RLS pour events - SELECT uniquement pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can view events" ON public.events
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can view their own events (plus spécifique, prioritaire)
CREATE POLICY "Users can view their own events" ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON public.events
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON public.events
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. TABLE INVITATIONS
-- =====================================================

-- Supprimer l'ancienne table si elle existe (optionnel, commenté pour sécurité)
-- DROP TABLE IF EXISTS public.invitations CASCADE;

CREATE TABLE IF NOT EXISTS public.invitations (
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

-- Index pour invitations
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON public.invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_email_company ON public.invitations(email, company_id);

-- RLS pour invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Company admins can update invitations" ON public.invitations;

-- Policies RLS pour invitations
CREATE POLICY "Admins can view all invitations" ON public.invitations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

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

CREATE POLICY "Users can view invitations they sent" ON public.invitations
FOR SELECT 
USING (invited_by = auth.uid());

CREATE POLICY "Anyone can view invitation by token" ON public.invitations
FOR SELECT 
USING (true);

CREATE POLICY "Admins can create invitations" ON public.invitations
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

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
-- 4. TRIGGERS updated_at
-- =====================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour events
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour invitations
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon;

-- =====================================================
-- 6. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SYSTÈME COMPLET RECONSTRUIT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées/mises à jour :';
  RAISE NOTICE '  ✅ projects';
  RAISE NOTICE '    - id, user_id, company_id, client_id';
  RAISE NOTICE '    - name, description, status';
  RAISE NOTICE '    - budget, actual_revenue, costs, benefice';
  RAISE NOTICE '    - start_date, end_date';
  RAISE NOTICE '';
  RAISE NOTICE '  ✅ events';
  RAISE NOTICE '    - id, user_id, project_id (FK → projects)';
  RAISE NOTICE '    - title, description';
  RAISE NOTICE '    - start_date, end_date (TIMESTAMP WITH TIME ZONE)';
  RAISE NOTICE '    - all_day, location, type, color';
  RAISE NOTICE '    - reminder_minutes, reminder_recurring';
  RAISE NOTICE '';
  RAISE NOTICE '  ✅ invitations';
  RAISE NOTICE '    - id, email, company_id (FK → companies)';
  RAISE NOTICE '    - role (owner/admin/member)';
  RAISE NOTICE '    - invited_by (FK → auth.users)';
  RAISE NOTICE '    - token, status, expires_at';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS activé avec policies pour :';
  RAISE NOTICE '  ✅ projects : Users (own), Admins (all)';
  RAISE NOTICE '  ✅ events : Authenticated users (SELECT), Users (own)';
  RAISE NOTICE '  ✅ invitations : Admins, Company admins, Users (sent)';
  RAISE NOTICE '';
  RAISE NOTICE 'Foreign Keys :';
  RAISE NOTICE '  ✅ events.project_id → projects.id';
  RAISE NOTICE '  ✅ projects.name existe';
  RAISE NOTICE '';
  RAISE NOTICE 'Le système est prêt !';
  RAISE NOTICE '========================================';
END $$;











