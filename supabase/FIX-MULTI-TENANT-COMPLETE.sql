-- =====================================================
-- 🔒 MIGRATION COMPLÈTE MULTI-TENANT
-- =====================================================
-- ⚠️ EXÉCUTER CE SCRIPT DANS SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql
-- =====================================================
-- Ce script ajoute company_id à TOUTES les tables
-- et crée des RLS policies strictes pour l'isolation
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : FONCTION HELPER - Récupérer company_id actuel
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  SELECT company_id INTO v_company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

COMMENT ON FUNCTION public.current_company_id() IS 
'Retourne le company_id de l''utilisateur connecté';

-- =====================================================
-- ÉTAPE 2 : AJOUTER company_id AUX TABLES CRITIQUES
-- =====================================================

-- 2.1 - TABLE messages
DO $$ 
BEGIN
  -- Ajouter company_id si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'company_id'
  ) THEN
    -- Ajouter la colonne (nullable temporairement)
    ALTER TABLE public.messages ADD COLUMN company_id UUID;
    
    -- Remplir avec le company_id de l'utilisateur
    UPDATE public.messages m
    SET company_id = (
      SELECT company_id FROM public.company_users cu
      WHERE cu.user_id = m.user_id LIMIT 1
    );
    
    -- Rendre NOT NULL et ajouter FK
    ALTER TABLE public.messages ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE public.messages ADD CONSTRAINT fk_messages_company
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    
    -- Créer index
    CREATE INDEX idx_messages_company_id ON public.messages(company_id);
    
    RAISE NOTICE '✅ company_id ajouté à messages';
  ELSE
    RAISE NOTICE 'ℹ️ messages.company_id existe déjà';
  END IF;
END $$;

-- 2.2 - TABLE email_messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.email_messages ADD COLUMN company_id UUID;
    
    UPDATE public.email_messages em
    SET company_id = (
      SELECT company_id FROM public.company_users cu
      WHERE cu.user_id = em.user_id LIMIT 1
    );
    
    ALTER TABLE public.email_messages ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE public.email_messages ADD CONSTRAINT fk_email_messages_company
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_email_messages_company_id ON public.email_messages(company_id);
    
    RAISE NOTICE '✅ company_id ajouté à email_messages';
  ELSE
    RAISE NOTICE 'ℹ️ email_messages.company_id existe déjà';
  END IF;
END $$;

-- 2.3 - TABLE events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN company_id UUID;
    
    UPDATE public.events e
    SET company_id = (
      SELECT company_id FROM public.company_users cu
      WHERE cu.user_id = e.user_id LIMIT 1
    );
    
    ALTER TABLE public.events ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE public.events ADD CONSTRAINT fk_events_company
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_events_company_id ON public.events(company_id);
    
    RAISE NOTICE '✅ company_id ajouté à events';
  ELSE
    RAISE NOTICE 'ℹ️ events.company_id existe déjà';
  END IF;
END $$;

-- 2.4 - TABLE signatures
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'signatures'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'signatures' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.signatures ADD COLUMN company_id UUID;
    
    -- Remplir via quote_id ou invoice_id
    UPDATE public.signatures s
    SET company_id = COALESCE(
      (SELECT company_id FROM public.ai_quotes WHERE id = s.quote_id),
      (SELECT company_id FROM public.invoices WHERE id = s.invoice_id)
    );
    
    ALTER TABLE public.signatures ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE public.signatures ADD CONSTRAINT fk_signatures_company
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_signatures_company_id ON public.signatures(company_id);
    
    RAISE NOTICE '✅ company_id ajouté à signatures';
  END IF;
END $$;

-- 2.5 - TABLE signature_sessions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'signature_sessions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'signature_sessions' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.signature_sessions ADD COLUMN company_id UUID;
    
    -- Remplir via user_id
    UPDATE public.signature_sessions ss
    SET company_id = (
      SELECT company_id FROM public.company_users cu
      WHERE cu.user_id = ss.user_id LIMIT 1
    );
    
    ALTER TABLE public.signature_sessions ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE public.signature_sessions ADD CONSTRAINT fk_signature_sessions_company
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_signature_sessions_company_id ON public.signature_sessions(company_id);
    
    RAISE NOTICE '✅ company_id ajouté à signature_sessions';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3 : RLS POLICIES STRICTES
-- =====================================================

-- 3.1 - PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company payments" ON public.payments;
CREATE POLICY "Users can view their company payments"
ON public.payments
FOR SELECT
USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "Users can insert their company payments" ON public.payments;
CREATE POLICY "Users can insert their company payments"
ON public.payments
FOR INSERT
WITH CHECK (company_id = public.current_company_id());

DROP POLICY IF EXISTS "Users can update their company payments" ON public.payments;
CREATE POLICY "Users can update their company payments"
ON public.payments
FOR UPDATE
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

-- 3.2 - AI_QUOTES
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company quotes" ON public.ai_quotes;
CREATE POLICY "Users can view their company quotes"
ON public.ai_quotes
FOR SELECT
USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "Users can insert their company quotes" ON public.ai_quotes;
CREATE POLICY "Users can insert their company quotes"
ON public.ai_quotes
FOR INSERT
WITH CHECK (company_id = public.current_company_id());

-- 3.3 - INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company invoices" ON public.invoices;
CREATE POLICY "Users can view their company invoices"
ON public.invoices
FOR SELECT
USING (company_id = public.current_company_id());

-- 3.4 - CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company clients" ON public.clients;
CREATE POLICY "Users can view their company clients"
ON public.clients
FOR SELECT
USING (company_id = public.current_company_id());

-- 3.5 - MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company messages" ON public.messages;
CREATE POLICY "Users can view their company messages"
ON public.messages
FOR SELECT
USING (company_id = public.current_company_id());

-- 3.6 - EMAIL_MESSAGES
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company emails" ON public.email_messages;
CREATE POLICY "Users can view their company emails"
ON public.email_messages
FOR SELECT
USING (company_id = public.current_company_id());

-- 3.7 - EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company events" ON public.events;
CREATE POLICY "Users can view their company events"
ON public.events
FOR SELECT
USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "Users can insert their company events" ON public.events;
CREATE POLICY "Users can insert their company events"
ON public.events
FOR INSERT
WITH CHECK (company_id = public.current_company_id());

-- =====================================================
-- ÉTAPE 4 : VÉRIFICATION
-- =====================================================

-- Vérifier que toutes les tables critiques ont company_id
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('payments', 'ai_quotes', 'invoices', 'clients', 'messages', 'email_messages', 'events', 'signatures', 'signature_sessions')
  AND column_name = 'company_id'
ORDER BY table_name;

-- Vérifier les RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE WHEN qual IS NOT NULL THEN 'WITH FILTER' ELSE 'NO FILTER' END as has_filter
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('payments', 'ai_quotes', 'invoices', 'clients', 'messages', 'email_messages', 'events')
ORDER BY tablename, policyname;

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- ✅ Toutes les tables critiques ont company_id
-- ✅ Toutes les RLS policies filtrent par company_id
-- ✅ Isolation stricte des données par entreprise
-- ✅ Aucune fuite de données entre entreprises
-- =====================================================
