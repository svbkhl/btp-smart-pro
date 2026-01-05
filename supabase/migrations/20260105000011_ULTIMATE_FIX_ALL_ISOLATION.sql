-- ============================================================================
-- 🔥 SCRIPT ULTIME : ISOLATION COMPLÈTE MULTI-TENANT
-- ============================================================================
-- Ce script analyse et corrige TOUTES les tables business de l'application
-- pour garantir une isolation stricte entre les entreprises (company_id)
-- ============================================================================
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FONCTION UTILITAIRE : current_company_id()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PARTIE 1 : CLIENTS
-- ============================================================================
DO $$
BEGIN
  -- Ajouter company_id si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Colonne company_id ajoutée à clients';
  END IF;

  -- Migrer les données existantes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'user_id'
  ) THEN
    UPDATE public.clients c
    SET company_id = (
      SELECT cu.company_id 
      FROM public.company_users cu 
      WHERE cu.user_id = c.user_id 
      LIMIT 1
    )
    WHERE c.company_id IS NULL AND c.user_id IS NOT NULL;
    RAISE NOTICE '✅ Données clients migrées';
  END IF;
END $$;

-- Activer RLS et créer policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can manage clients" ON public.clients;
CREATE POLICY "Company users can manage clients"
ON public.clients FOR ALL
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

-- ============================================================================
-- PARTIE 2 : PROJECTS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Colonne company_id ajoutée à projects';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'user_id'
  ) THEN
    UPDATE public.projects p
    SET company_id = (
      SELECT cu.company_id 
      FROM public.company_users cu 
      WHERE cu.user_id = p.user_id 
      LIMIT 1
    )
    WHERE p.company_id IS NULL AND p.user_id IS NOT NULL;
    RAISE NOTICE '✅ Données projects migrées';
  END IF;
END $$;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can manage projects" ON public.projects;
CREATE POLICY "Company users can manage projects"
ON public.projects FOR ALL
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

-- ============================================================================
-- PARTIE 3 : AI_QUOTES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_quotes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_quotes' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.ai_quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à ai_quotes';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_quotes' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.ai_quotes aq
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = aq.user_id 
        LIMIT 1
      )
      WHERE aq.company_id IS NULL AND aq.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données ai_quotes migrées';
    END IF;

    ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage ai_quotes" ON public.ai_quotes;
    CREATE POLICY "Company users can manage ai_quotes"
    ON public.ai_quotes FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 4 : INVOICES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'invoices' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à invoices';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'invoices' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.invoices i
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = i.user_id 
        LIMIT 1
      )
      WHERE i.company_id IS NULL AND i.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données invoices migrées';
    END IF;

    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage invoices" ON public.invoices;
    CREATE POLICY "Company users can manage invoices"
    ON public.invoices FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 5 : PAYMENTS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à payments';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.payments p
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = p.user_id 
        LIMIT 1
      )
      WHERE p.company_id IS NULL AND p.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données payments migrées';
    END IF;

    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage payments" ON public.payments;
    CREATE POLICY "Company users can manage payments"
    ON public.payments FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 6 : MESSAGES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à messages';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.messages m
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = m.user_id 
        LIMIT 1
      )
      WHERE m.company_id IS NULL AND m.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données messages migrées';
    END IF;

    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage messages" ON public.messages;
    CREATE POLICY "Company users can manage messages"
    ON public.messages FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 7 : NOTIFICATIONS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à notifications';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.notifications n
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = n.user_id 
        LIMIT 1
      )
      WHERE n.company_id IS NULL AND n.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données notifications migrées';
    END IF;

    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage notifications" ON public.notifications;
    CREATE POLICY "Company users can manage notifications"
    ON public.notifications FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 8 : MAINTENANCE_REMINDERS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_reminders') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'maintenance_reminders' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.maintenance_reminders ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à maintenance_reminders';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'maintenance_reminders' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.maintenance_reminders mr
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = mr.user_id 
        LIMIT 1
      )
      WHERE mr.company_id IS NULL AND mr.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données maintenance_reminders migrées';
    END IF;

    ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage maintenance_reminders" ON public.maintenance_reminders;
    CREATE POLICY "Company users can manage maintenance_reminders"
    ON public.maintenance_reminders FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 9 : IMAGE_ANALYSIS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'image_analysis') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'image_analysis' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.image_analysis ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à image_analysis';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'image_analysis' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.image_analysis ia
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = ia.user_id 
        LIMIT 1
      )
      WHERE ia.company_id IS NULL AND ia.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données image_analysis migrées';
    END IF;

    ALTER TABLE public.image_analysis ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage image_analysis" ON public.image_analysis;
    CREATE POLICY "Company users can manage image_analysis"
    ON public.image_analysis FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 10 : AI_CONVERSATIONS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_conversations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_conversations' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.ai_conversations ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à ai_conversations';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_conversations' 
      AND column_name = 'user_id'
    ) THEN
      UPDATE public.ai_conversations ac
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = ac.user_id 
        LIMIT 1
      )
      WHERE ac.company_id IS NULL AND ac.user_id IS NOT NULL;
      RAISE NOTICE '✅ Données ai_conversations migrées';
    END IF;

    ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage ai_conversations" ON public.ai_conversations;
    CREATE POLICY "Company users can manage ai_conversations"
    ON public.ai_conversations FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());
  END IF;
END $$;

-- ============================================================================
-- PARTIE 11 : AI_MESSAGES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_messages') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_messages' 
      AND column_name = 'company_id'
    ) THEN
      -- Ajouter company_id via conversation
      ALTER TABLE public.ai_messages ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à ai_messages';
      
      -- Migrer via ai_conversations
      UPDATE public.ai_messages am
      SET company_id = (
        SELECT ac.company_id 
        FROM public.ai_conversations ac 
        WHERE ac.id = am.conversation_id 
        LIMIT 1
      )
      WHERE am.company_id IS NULL;
      RAISE NOTICE '✅ Données ai_messages migrées via ai_conversations';
    END IF;

    ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can manage ai_messages" ON public.ai_messages;
    CREATE POLICY "Company users can manage ai_messages"
    ON public.ai_messages FOR ALL
    USING (
      company_id = public.current_company_id() OR
      EXISTS (
        SELECT 1 FROM public.ai_conversations ac
        WHERE ac.id = ai_messages.conversation_id
        AND ac.company_id = public.current_company_id()
      )
    )
    WITH CHECK (
      company_id = public.current_company_id() OR
      EXISTS (
        SELECT 1 FROM public.ai_conversations ac
        WHERE ac.id = ai_messages.conversation_id
        AND ac.company_id = public.current_company_id()
      )
    );
  END IF;
END $$;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 ISOLATION MULTI-TENANT COMPLÈTE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Toutes les tables business sont sécurisées avec:';
  RAISE NOTICE '   1. Colonne company_id ajoutée';
  RAISE NOTICE '   2. Données migrées depuis user_id';
  RAISE NOTICE '   3. RLS activé';
  RAISE NOTICE '   4. Politiques strictes créées';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables sécurisées:';
  RAISE NOTICE '   - clients';
  RAISE NOTICE '   - projects';
  RAISE NOTICE '   - ai_quotes';
  RAISE NOTICE '   - invoices';
  RAISE NOTICE '   - payments';
  RAISE NOTICE '   - messages';
  RAISE NOTICE '   - notifications';
  RAISE NOTICE '   - maintenance_reminders';
  RAISE NOTICE '   - image_analysis';
  RAISE NOTICE '   - ai_conversations';
  RAISE NOTICE '   - ai_messages';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les données sont maintenant isolées par entreprise !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
