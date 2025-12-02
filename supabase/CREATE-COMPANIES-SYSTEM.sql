-- =====================================================
-- SYSTÈME MULTI-ENTREPRISES (SaaS)
-- =====================================================
-- Ce script crée le système de gestion multi-entreprises
-- avec modules activés/désactivés et niveaux de support

-- =====================================================
-- 1. TABLE: companies
-- =====================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'custom' CHECK (plan IN ('basic', 'pro', 'enterprise', 'custom')),
  features JSONB DEFAULT '{}'::jsonb, -- modules activés
  settings JSONB DEFAULT '{}'::jsonb, -- couleurs, logos, menus
  support_level INTEGER DEFAULT 0 CHECK (support_level IN (0, 1, 2)), -- 0 = pas de SAV, 1 = standard, 2 = premium
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'no_support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

-- =====================================================
-- 2. TABLE: company_users (liaison utilisateurs ↔ entreprises)
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

-- =====================================================
-- 3. TABLE: interventions (facturation SAV)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('standard', 'urgence', 'bug_fix', 'custom')),
  description TEXT NOT NULL,
  duration_hours NUMERIC DEFAULT 0,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_interventions_company_id ON public.interventions(company_id);
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON public.interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON public.interventions(status);

-- =====================================================
-- 4. AJOUTER company_id AUX TABLES EXISTANTES
-- =====================================================

-- Fonction pour ajouter company_id si la colonne n'existe pas
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
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'candidatures' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.candidatures ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_candidatures_company_id ON public.candidatures(company_id);
  END IF;

  -- taches_rh
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'taches_rh' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.taches_rh ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_taches_rh_company_id ON public.taches_rh(company_id);
  END IF;

  -- user_settings (garder user_id mais ajouter company_id pour référence)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_user_settings_company_id ON public.user_settings(company_id);
  END IF;
END $$;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- Policies pour companies
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;

CREATE POLICY "Users can view their company"
  ON public.companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

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
    -- Super admin (vérifier si l'utilisateur est admin système)
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- Policies pour company_users
DROP POLICY IF EXISTS "Users can view their company_users" ON public.company_users;
DROP POLICY IF EXISTS "Admins can manage company_users" ON public.company_users;

CREATE POLICY "Users can view their company_users"
  ON public.company_users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage company_users"
  ON public.company_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_users.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policies pour interventions
DROP POLICY IF EXISTS "Users can view their company interventions" ON public.interventions;
DROP POLICY IF EXISTS "Admins can manage interventions" ON public.interventions;

CREATE POLICY "Users can view their company interventions"
  ON public.interventions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage interventions"
  ON public.interventions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = interventions.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 6. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir la company_id d'un utilisateur
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

-- Fonction pour vérifier si une feature est activée
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

-- Fonction pour obtenir le niveau de support
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
-- 7. TRIGGER pour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interventions_updated_at ON public.interventions;
CREATE TRIGGER update_interventions_updated_at
  BEFORE UPDATE ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. DONNÉES DE TEST (optionnel)
-- =====================================================

-- Créer une entreprise de démonstration
INSERT INTO public.companies (id, name, plan, features, settings, support_level, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Entreprise Demo',
  'pro',
  '{
    "planning": true,
    "facturation": true,
    "devis": true,
    "projets": true,
    "documents": true,
    "messagerie": true,
    "ia_assistant": true,
    "employes": true
  }'::jsonb,
  '{
    "color_theme": "bleu",
    "logo_url": null,
    "menu_items": ["planning", "facturation", "devis", "projets", "messagerie", "ia_assistant", "employes"]
  }'::jsonb,
  2,
  'active'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE public.companies IS 'Entreprises du système SaaS multi-entreprises';
COMMENT ON TABLE public.company_users IS 'Liaison entre utilisateurs et entreprises';
COMMENT ON TABLE public.interventions IS 'Interventions SAV facturées';
COMMENT ON FUNCTION get_user_company_id(UUID) IS 'Retourne la company_id d''un utilisateur';
COMMENT ON FUNCTION is_feature_enabled(UUID, TEXT) IS 'Vérifie si une feature est activée pour une entreprise';
COMMENT ON FUNCTION get_support_level(UUID) IS 'Retourne le niveau de support d''une entreprise';




