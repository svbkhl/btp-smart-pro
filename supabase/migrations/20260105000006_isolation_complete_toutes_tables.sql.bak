-- ============================================================================
-- SCRIPT ULTIME CORRIGÉ: Isolation COMPLÈTE de TOUTES les données par company_id
-- Description: Corriger définitivement le mélange de données entre entreprises
-- Tables concernées: payments, quotes, invoices, clients, projects
-- Date: 2026-01-05
-- Version: FIXED (sans erreurs de syntaxe)
-- ============================================================================

-- ============================================================================
-- 1) TABLE: payments
-- ============================================================================

DO $$
BEGIN
  -- Ajouter company_id si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_payments_company_id ON public.payments(company_id);
    RAISE NOTICE '✅ Colonne company_id ajoutée à payments';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne company_id existe déjà dans payments';
  END IF;
END $$;

-- Migrer via quotes
UPDATE public.payments p
SET company_id = q.company_id
FROM public.quotes q
WHERE p.quote_id = q.id AND p.company_id IS NULL;

-- Migrer via invoices
UPDATE public.payments p
SET company_id = i.company_id
FROM public.invoices i
WHERE p.invoice_id = i.id AND p.company_id IS NULL;

-- Migrer via user_id (prendre la première entreprise trouvée)
UPDATE public.payments p
SET company_id = (
  SELECT company_id FROM public.company_users 
  WHERE user_id = p.user_id 
  LIMIT 1
)
WHERE p.user_id IS NOT NULL AND p.company_id IS NULL;

-- Activer RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Users can view payments of their company" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments for their company" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments of their company" ON public.payments;
DROP POLICY IF EXISTS "Users can delete payments of their company" ON public.payments;

-- Créer nouvelles policies
CREATE POLICY "Users can view payments of their company"
ON public.payments FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payments for their company"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payments of their company"
ON public.payments FOR UPDATE TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Only owners can delete payments"
ON public.payments FOR DELETE TO authenticated
USING (company_id IN (
  SELECT cu.company_id FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  WHERE cu.user_id = auth.uid() AND r.slug = 'owner'
));

DO $$ BEGIN RAISE NOTICE '✅ RLS activé sur payments'; END $$;

-- ============================================================================
-- 2) TABLE: quotes (CRITIQUE - Source du problème)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_quotes_company_id ON public.quotes(company_id);
    RAISE NOTICE '✅ Colonne company_id ajoutée à quotes';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne company_id existe déjà dans quotes';
  END IF;
END $$;

-- Migrer via user_id
UPDATE public.quotes q
SET company_id = (
  SELECT company_id FROM public.company_users 
  WHERE user_id = q.user_id 
  LIMIT 1
)
WHERE q.user_id IS NOT NULL AND q.company_id IS NULL;

-- Activer RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Users can view quotes of their company" ON public.quotes;
DROP POLICY IF EXISTS "Users can create quotes for their company" ON public.quotes;
DROP POLICY IF EXISTS "Users can update quotes of their company" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete quotes of their company" ON public.quotes;

-- Créer nouvelles policies
CREATE POLICY "Users can view quotes of their company"
ON public.quotes FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create quotes for their company"
ON public.quotes FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update quotes of their company"
ON public.quotes FOR UPDATE TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete quotes of their company"
ON public.quotes FOR DELETE TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DO $$ BEGIN RAISE NOTICE '✅ RLS activé sur quotes'; END $$;

-- ============================================================================
-- 3) TABLE: invoices
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
    RAISE NOTICE '✅ Colonne company_id ajoutée à invoices';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne company_id existe déjà dans invoices';
  END IF;
END $$;

-- Migrer via user_id
UPDATE public.invoices i
SET company_id = (
  SELECT company_id FROM public.company_users 
  WHERE user_id = i.user_id 
  LIMIT 1
)
WHERE i.user_id IS NOT NULL AND i.company_id IS NULL;

-- Activer RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Users can view invoices of their company" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices for their company" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices of their company" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices of their company" ON public.invoices;

-- Créer nouvelles policies
CREATE POLICY "Users can view invoices of their company"
ON public.invoices FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create invoices for their company"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update invoices of their company"
ON public.invoices FOR UPDATE TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete invoices of their company"
ON public.invoices FOR DELETE TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DO $$ BEGIN RAISE NOTICE '✅ RLS activé sur invoices'; END $$;

-- ============================================================================
-- 4) TABLE: clients
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_clients_company_id ON public.clients(company_id);
    RAISE NOTICE '✅ Colonne company_id ajoutée à clients';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne company_id existe déjà dans clients';
  END IF;
END $$;

-- Migrer via user_id
UPDATE public.clients c
SET company_id = (
  SELECT company_id FROM public.company_users 
  WHERE user_id = c.user_id 
  LIMIT 1
)
WHERE c.user_id IS NOT NULL AND c.company_id IS NULL;

-- Migrer via created_by si user_id n'existe pas
UPDATE public.clients c
SET company_id = (
  SELECT company_id FROM public.company_users 
  WHERE user_id = c.created_by 
  LIMIT 1
)
WHERE c.created_by IS NOT NULL AND c.company_id IS NULL;

-- Activer RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Users can view clients of their company" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients for their company" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients of their company" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients of their company" ON public.clients;

-- Créer nouvelles policies
CREATE POLICY "Users can view clients of their company"
ON public.clients FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create clients for their company"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update clients of their company"
ON public.clients FOR UPDATE TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete clients of their company"
ON public.clients FOR DELETE TO authenticated
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DO $$ BEGIN RAISE NOTICE '✅ RLS activé sur clients'; END $$;

-- ============================================================================
-- 5) TABLE: projects (si elle existe)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      CREATE INDEX idx_projects_company_id ON public.projects(company_id);
      RAISE NOTICE '✅ Colonne company_id ajoutée à projects';
    ELSE
      RAISE NOTICE 'ℹ️  Colonne company_id existe déjà dans projects';
    END IF;
  END IF;
END $$;

-- Migrer via user_id (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    UPDATE public.projects p
    SET company_id = (
      SELECT company_id FROM public.company_users 
      WHERE user_id = p.user_id 
      LIMIT 1
    )
    WHERE p.user_id IS NOT NULL AND p.company_id IS NULL;
  END IF;
END $$;

-- Activer RLS (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view projects of their company" ON public.projects;
    DROP POLICY IF EXISTS "Users can create projects for their company" ON public.projects;
    DROP POLICY IF EXISTS "Users can update projects of their company" ON public.projects;
    DROP POLICY IF EXISTS "Users can delete projects of their company" ON public.projects;

    EXECUTE 'CREATE POLICY "Users can view projects of their company" ON public.projects FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can create projects for their company" ON public.projects FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can update projects of their company" ON public.projects FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can delete projects of their company" ON public.projects FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';

    RAISE NOTICE '✅ RLS activé sur projects';
  END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

DO $$
DECLARE
  table_record RECORD;
  policy_count INTEGER;
  total_policies INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RAPPORT FINAL - ISOLATION DES DONNÉES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('payments', 'quotes', 'invoices', 'clients', 'projects')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tablename)
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = table_record.tablename;
    
    total_policies := total_policies + policy_count;
    RAISE NOTICE '✅ % : % policies RLS', table_record.tablename, policy_count;
  END LOOP;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 TOTAL : % policies RLS créées', total_policies;
  RAISE NOTICE '🔒 ISOLATION COMPLÈTE ACTIVÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT ULTIME CORRIGÉ
-- ============================================================================
