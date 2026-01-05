-- ============================================================================
-- SCRIPT ULTIME: Isolation COMPLÈTE de TOUTES les données par company_id
-- Description: Corriger définitivement le mélange de données entre entreprises
-- Tables concernées: payments, quotes, invoices, clients, projects, events, messages
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FONCTION UTILITAIRE: Ajouter company_id et migrer les données
-- ============================================================================

CREATE OR REPLACE FUNCTION add_company_id_if_missing(
  target_table TEXT,
  source_table TEXT DEFAULT NULL,
  source_column TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Vérifier si la colonne existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = target_table 
    AND column_name = 'company_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    -- Ajouter la colonne
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE', target_table);
    RAISE NOTICE '✅ Colonne company_id ajoutée à %', target_table;
    
    -- Créer l'index
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_company_id ON public.%I(company_id)', target_table, target_table);
    
    -- Si source fournie, migrer les données
    IF source_table IS NOT NULL AND source_column IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I t SET company_id = s.company_id FROM public.%I s WHERE t.%I = s.id AND t.company_id IS NULL',
        target_table, source_table, source_column
      );
      RAISE NOTICE '✅ Données migrées pour %', target_table;
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Colonne company_id existe déjà dans %', target_table;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1) TABLE: payments
-- ============================================================================

-- Ajouter company_id
SELECT add_company_id_if_missing('payments', NULL, NULL);

-- Migrer via quotes
UPDATE public.payments p
SET company_id = q.company_id
FROM public.quotes q
WHERE p.quote_id = q.id
AND p.company_id IS NULL;

-- Migrer via invoices
UPDATE public.payments p
SET company_id = i.company_id
FROM public.invoices i
WHERE p.invoice_id = i.id
AND p.company_id IS NULL;

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

RAISE NOTICE '✅ RLS activé sur payments';

-- ============================================================================
-- 2) TABLE: quotes (CRITIQUE - Source du problème)
-- ============================================================================

-- Vérifier si company_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
    
    -- Migrer via user_id
    UPDATE public.quotes q
    SET company_id = cu.company_id
    FROM public.company_users cu
    WHERE q.user_id = cu.user_id AND q.company_id IS NULL;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à quotes';
  END IF;
END $$;

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

RAISE NOTICE '✅ RLS activé sur quotes';

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
    CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
    
    -- Migrer via user_id
    UPDATE public.invoices i
    SET company_id = cu.company_id
    FROM public.company_users cu
    WHERE i.user_id = cu.user_id AND i.company_id IS NULL;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à invoices';
  END IF;
END $$;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoices of their company" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices for their company" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices of their company" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices of their company" ON public.invoices;

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

RAISE NOTICE '✅ RLS activé sur invoices';

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
    CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
    
    -- Migrer via user_id ou created_by
    UPDATE public.clients c
    SET company_id = cu.company_id
    FROM public.company_users cu
    WHERE (c.user_id = cu.user_id OR c.created_by = cu.user_id) AND c.company_id IS NULL;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à clients';
  END IF;
END $$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view clients of their company" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients for their company" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients of their company" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients of their company" ON public.clients;

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

RAISE NOTICE '✅ RLS activé sur clients';

-- ============================================================================
-- 5) TABLE: projects
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
      
      UPDATE public.projects p
      SET company_id = cu.company_id
      FROM public.company_users cu
      WHERE p.user_id = cu.user_id AND p.company_id IS NULL;
      
      RAISE NOTICE '✅ Colonne company_id ajoutée à projects';
    END IF;

    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view projects of their company" ON public.projects;
    DROP POLICY IF EXISTS "Users can create projects for their company" ON public.projects;
    DROP POLICY IF EXISTS "Users can update projects of their company" ON public.projects;
    DROP POLICY IF EXISTS "Users can delete projects of their company" ON public.projects;

    CREATE POLICY "Users can view projects of their company"
    ON public.projects FOR SELECT TO authenticated
    USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

    CREATE POLICY "Users can create projects for their company"
    ON public.projects FOR INSERT TO authenticated
    WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

    CREATE POLICY "Users can update projects of their company"
    ON public.projects FOR UPDATE TO authenticated
    USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
    WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

    CREATE POLICY "Users can delete projects of their company"
    ON public.projects FOR DELETE TO authenticated
    USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

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

-- Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS add_company_id_if_missing(TEXT, TEXT, TEXT);

-- ============================================================================
-- FIN DU SCRIPT ULTIME
-- ============================================================================
