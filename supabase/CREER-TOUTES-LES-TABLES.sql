-- =====================================================
-- 🚀 CRÉER TOUTES LES TABLES NÉCESSAIRES
-- =====================================================
-- Ce script crée TOUTES les tables de l'application
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : DÉSACTIVER RLS TEMPORAIREMENT
-- =====================================================
ALTER TABLE IF EXISTS public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_settings DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- ÉTAPE 2 : CRÉER companies
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
-- ÉTAPE 3 : CRÉER user_roles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('administrateur', 'utilisateur')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- =====================================================
-- ÉTAPE 4 : CRÉER company_users
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
-- ÉTAPE 5 : CRÉER clients
-- =====================================================
-- Supprimer la table si elle existe avec une mauvaise structure
DROP TABLE IF EXISTS public.clients CASCADE;

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);

-- =====================================================
-- ÉTAPE 6 : CRÉER projects
-- =====================================================
-- Supprimer la table si elle existe avec une mauvaise structure
DROP TABLE IF EXISTS public.projects CASCADE;

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- =====================================================
-- ÉTAPE 7 : CRÉER ai_quotes
-- =====================================================
-- Supprimer la table si elle existe avec une mauvaise structure
DROP TABLE IF EXISTS public.ai_quotes CASCADE;

CREATE TABLE public.ai_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  quote_number TEXT,
  title TEXT,
  content JSONB,
  total_amount NUMERIC,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_quotes_user_id ON public.ai_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_company_id ON public.ai_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_client_id ON public.ai_quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_status ON public.ai_quotes(status);

-- =====================================================
-- ÉTAPE 8 : CRÉER invoices
-- =====================================================
-- Supprimer la table si elle existe avec une mauvaise structure
DROP TABLE IF EXISTS public.invoices CASCADE;

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- =====================================================
-- ÉTAPE 9 : CRÉER payments
-- =====================================================
-- Supprimer la table si elle existe avec une mauvaise structure
DROP TABLE IF EXISTS public.payments CASCADE;

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- =====================================================
-- ÉTAPE 10 : CRÉER user_settings (si n'existe pas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  company_logo_url TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_siret TEXT,
  company_vat TEXT,
  app_base_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- =====================================================
-- ÉTAPE 11 : INSÉRER LE RÔLE ADMIN
-- =====================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur' 
FROM auth.users 
WHERE email = 'sabri.khalfallah6@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- ÉTAPE 12 : CRÉER LES FONCTIONS ET TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
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
  EXECUTE FUNCTION public.update_companies_updated_at();

-- =====================================================
-- ÉTAPE 13 : RÉACTIVER RLS
-- =====================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ÉTAPE 14 : CRÉER LES RLS POLICIES - companies
-- =====================================================
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- ÉTAPE 15 : CRÉER LES RLS POLICIES - user_roles
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
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

DROP POLICY IF EXISTS "Users can create their own roles" ON public.user_roles;
CREATE POLICY "Users can create their own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 16 : CRÉER LES RLS POLICIES - company_users
-- =====================================================
DROP POLICY IF EXISTS "Users can view their company_users" ON public.company_users;
CREATE POLICY "Users can view their company_users"
  ON public.company_users FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage company_users" ON public.company_users;
CREATE POLICY "Admins can manage company_users"
  ON public.company_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- ÉTAPE 17 : CRÉER LES RLS POLICIES - clients
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients"
  ON public.clients FOR ALL
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = clients.company_id 
        AND user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = clients.company_id 
        AND user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- ÉTAPE 18 : CRÉER LES RLS POLICIES - projects
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
CREATE POLICY "Users can manage their own projects"
  ON public.projects FOR ALL
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = projects.company_id 
        AND user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = projects.company_id 
        AND user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- ÉTAPE 19 : CRÉER LES RLS POLICIES - ai_quotes
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their own ai_quotes" ON public.ai_quotes;
CREATE POLICY "Users can manage their own ai_quotes"
  ON public.ai_quotes FOR ALL
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = ai_quotes.company_id 
        AND user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = ai_quotes.company_id 
        AND user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- ÉTAPE 20 : CRÉER LES RLS POLICIES - invoices
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their own invoices" ON public.invoices;
CREATE POLICY "Users can manage their own invoices"
  ON public.invoices FOR ALL
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = invoices.company_id 
        AND user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = invoices.company_id 
        AND user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- ÉTAPE 21 : CRÉER LES RLS POLICIES - payments
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
CREATE POLICY "Users can manage their own payments"
  ON public.payments FOR ALL
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = payments.company_id 
        AND user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
    OR
    (
      company_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = payments.company_id 
        AND user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- ÉTAPE 22 : CRÉER LES RLS POLICIES - user_settings
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 23 : RAPPORT FINAL
-- =====================================================
SELECT 
  '✅ TOUTES LES TABLES SONT CRÉÉES !' as status,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') as companies,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') as user_roles,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_users') as company_users,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') as clients,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') as projects,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_quotes') as ai_quotes,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') as invoices,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') as payments,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') as user_settings,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'administrateur') as nombre_admins;

