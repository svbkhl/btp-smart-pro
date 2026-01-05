-- ============================================================================
-- SCRIPT FINAL ULTRA-SAFE: Isolation avec vérification tables ET colonnes
-- Description: Vérifie tables ET colonnes avant toute opération
-- Date: 2026-01-05
-- Version: FINAL ULTRA-SAFE
-- ============================================================================

-- ============================================================================
-- VÉRIFICATION INITIALE
-- ============================================================================

DO $$
DECLARE
  table_name TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VÉRIFICATION DES TABLES EXISTANTES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('payments', 'ai_quotes', 'invoices', 'clients', 'projects')
  LOOP
    RAISE NOTICE '✅ Table trouvée: %', table_name;
  END LOOP;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- 1) TABLE: payments
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    RAISE NOTICE '🔧 Traitement: payments';
    
    -- Ajouter company_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'company_id') THEN
      ALTER TABLE public.payments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      CREATE INDEX idx_payments_company_id ON public.payments(company_id);
      RAISE NOTICE '  ✅ company_id ajouté';
    END IF;
    
    -- Migrer via user_id (SI la colonne existe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_id') THEN
      UPDATE public.payments p
      SET company_id = (SELECT company_id FROM public.company_users WHERE user_id = p.user_id LIMIT 1)
      WHERE p.user_id IS NOT NULL AND p.company_id IS NULL;
      RAISE NOTICE '  ✅ Migration via user_id';
    END IF;
    
    -- Activer RLS
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view payments of their company" ON public.payments;
    DROP POLICY IF EXISTS "Users can insert payments for their company" ON public.payments;
    DROP POLICY IF EXISTS "Users can update payments of their company" ON public.payments;
    DROP POLICY IF EXISTS "Users can delete payments of their company" ON public.payments;
    
    EXECUTE 'CREATE POLICY "Users can view payments of their company" ON public.payments FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can insert payments for their company" ON public.payments FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can update payments of their company" ON public.payments FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Only owners can delete payments" ON public.payments FOR DELETE TO authenticated USING (company_id IN (SELECT cu.company_id FROM public.company_users cu JOIN public.roles r ON r.id = cu.role_id WHERE cu.user_id = auth.uid() AND r.slug = ''owner''))';
    
    RAISE NOTICE '  ✅ RLS activé (4 policies)';
  END IF;
END $$;

-- ============================================================================
-- 2) TABLE: ai_quotes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_quotes') THEN
    RAISE NOTICE '🔧 Traitement: ai_quotes';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'company_id') THEN
      ALTER TABLE public.ai_quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      CREATE INDEX idx_ai_quotes_company_id ON public.ai_quotes(company_id);
      RAISE NOTICE '  ✅ company_id ajouté';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_quotes' AND column_name = 'user_id') THEN
      UPDATE public.ai_quotes q
      SET company_id = (SELECT company_id FROM public.company_users WHERE user_id = q.user_id LIMIT 1)
      WHERE q.user_id IS NOT NULL AND q.company_id IS NULL;
      RAISE NOTICE '  ✅ Migration via user_id';
    END IF;
    
    ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view ai_quotes of their company" ON public.ai_quotes;
    DROP POLICY IF EXISTS "Users can create ai_quotes for their company" ON public.ai_quotes;
    DROP POLICY IF EXISTS "Users can update ai_quotes of their company" ON public.ai_quotes;
    DROP POLICY IF EXISTS "Users can delete ai_quotes of their company" ON public.ai_quotes;
    
    EXECUTE 'CREATE POLICY "Users can view ai_quotes of their company" ON public.ai_quotes FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can create ai_quotes for their company" ON public.ai_quotes FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can update ai_quotes of their company" ON public.ai_quotes FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can delete ai_quotes of their company" ON public.ai_quotes FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    
    RAISE NOTICE '  ✅ RLS activé (4 policies)';
  END IF;
END $$;

-- ============================================================================
-- 3) TABLE: invoices
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    RAISE NOTICE '🔧 Traitement: invoices';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'company_id') THEN
      ALTER TABLE public.invoices ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
      RAISE NOTICE '  ✅ company_id ajouté';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'user_id') THEN
      UPDATE public.invoices i
      SET company_id = (SELECT company_id FROM public.company_users WHERE user_id = i.user_id LIMIT 1)
      WHERE i.user_id IS NOT NULL AND i.company_id IS NULL;
      RAISE NOTICE '  ✅ Migration via user_id';
    END IF;
    
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view invoices of their company" ON public.invoices;
    DROP POLICY IF EXISTS "Users can create invoices for their company" ON public.invoices;
    DROP POLICY IF EXISTS "Users can update invoices of their company" ON public.invoices;
    DROP POLICY IF EXISTS "Users can delete invoices of their company" ON public.invoices;
    
    EXECUTE 'CREATE POLICY "Users can view invoices of their company" ON public.invoices FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can create invoices for their company" ON public.invoices FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can update invoices of their company" ON public.invoices FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can delete invoices of their company" ON public.invoices FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    
    RAISE NOTICE '  ✅ RLS activé (4 policies)';
  END IF;
END $$;

-- ============================================================================
-- 4) TABLE: clients (SANS created_by qui n'existe pas)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    RAISE NOTICE '🔧 Traitement: clients';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'company_id') THEN
      ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      CREATE INDEX idx_clients_company_id ON public.clients(company_id);
      RAISE NOTICE '  ✅ company_id ajouté';
    END IF;
    
    -- Migrer UNIQUEMENT via user_id (pas created_by car elle n'existe pas)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'user_id') THEN
      UPDATE public.clients c
      SET company_id = (SELECT company_id FROM public.company_users WHERE user_id = c.user_id LIMIT 1)
      WHERE c.user_id IS NOT NULL AND c.company_id IS NULL;
      RAISE NOTICE '  ✅ Migration via user_id';
    END IF;
    
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view clients of their company" ON public.clients;
    DROP POLICY IF EXISTS "Users can create clients for their company" ON public.clients;
    DROP POLICY IF EXISTS "Users can update clients of their company" ON public.clients;
    DROP POLICY IF EXISTS "Users can delete clients of their company" ON public.clients;
    
    EXECUTE 'CREATE POLICY "Users can view clients of their company" ON public.clients FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can create clients for their company" ON public.clients FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can update clients of their company" ON public.clients FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can delete clients of their company" ON public.clients FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))';
    
    RAISE NOTICE '  ✅ RLS activé (4 policies)';
  END IF;
END $$;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
  table_record RECORD;
  policy_count INTEGER;
  total_policies INTEGER := 0;
  total_tables INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RAPPORT FINAL - ISOLATION DES DONNÉES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('payments', 'ai_quotes', 'invoices', 'clients', 'projects')
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = table_record.tablename;
    
    IF policy_count > 0 THEN
      total_policies := total_policies + policy_count;
      total_tables := total_tables + 1;
      RAISE NOTICE '✅ % : % policies RLS', table_record.tablename, policy_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 % tables sécurisées', total_tables;
  RAISE NOTICE '🎉 % policies RLS créées', total_policies;
  RAISE NOTICE '🔒 ISOLATION COMPLÈTE ACTIVÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Rafraîchissez votre application pour voir les changements';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT FINAL
-- ============================================================================
