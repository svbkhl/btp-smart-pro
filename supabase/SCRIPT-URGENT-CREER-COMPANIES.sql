-- =====================================================
-- 🚨 SCRIPT URGENT - CRÉER TABLE companies
-- =====================================================
-- Copie ce script ENTIER dans Supabase SQL Editor
-- =====================================================

-- 1. Créer la table companies
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

-- 2. Créer les index
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);

-- 3. Activer RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes policies
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;

-- 5. Créer la policy pour les admins
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    -- Pour SELECT/UPDATE/DELETE : vérifier si admin OU dans company_users
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
    -- Pour INSERT : permettre uniquement aux admins système
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- 6. Créer la fonction pour updated_at
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public.companies;
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_companies_updated_at();

-- 8. Vérification finale
SELECT 
  '✅ Table companies créée avec succès !' as message,
  COUNT(*) as nombre_de_lignes
FROM public.companies;















