-- ============================================================================
-- 🔥 FIX COMPLET : Table events avec company_id et RLS
-- ============================================================================
-- Description: Recrée proprement la table events avec isolation multi-tenant
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Ajouter company_id à events si elle existe
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    -- Ajouter company_id si manquant
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.events ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Colonne company_id ajoutée à events';
    END IF;

    -- Migrer les données existantes
    UPDATE public.events e
    SET company_id = (
      SELECT cu.company_id 
      FROM public.company_users cu 
      WHERE cu.user_id = e.user_id 
      LIMIT 1
    )
    WHERE e.company_id IS NULL AND e.user_id IS NOT NULL;
    RAISE NOTICE '✅ Données events migrées';

    -- Créer l'index
    CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.events(company_id);
    
    -- Activer RLS
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

    -- Supprimer les anciennes policies
    DROP POLICY IF EXISTS "Company users can manage events" ON public.events;
    DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
    DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
    DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
    DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

    -- Créer la policy avec company_id
    CREATE POLICY "Company users can manage events"
    ON public.events FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());

    RAISE NOTICE '✅ RLS activé sur events avec isolation par company_id';
  ELSE
    -- Créer la table events si elle n'existe pas
    CREATE TABLE public.events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
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
    CREATE INDEX idx_events_user_id ON public.events(user_id);
    CREATE INDEX idx_events_company_id ON public.events(company_id);
    CREATE INDEX idx_events_project_id ON public.events(project_id) WHERE project_id IS NOT NULL;
    CREATE INDEX idx_events_start_date ON public.events(start_date);

    -- Trigger pour updated_at
    CREATE TRIGGER update_events_updated_at
      BEFORE UPDATE ON public.events
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    -- Activer RLS
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

    -- Créer la policy
    CREATE POLICY "Company users can manage events"
    ON public.events FOR ALL
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id());

    RAISE NOTICE '✅ Table events créée avec company_id et RLS';
  END IF;
END $$;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 TABLE EVENTS SÉCURISÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table events avec company_id';
  RAISE NOTICE '✅ Données migrées depuis user_id';
  RAISE NOTICE '✅ RLS activé avec isolation stricte';
  RAISE NOTICE '✅ Indexes créés pour performance';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les événements sont isolés par entreprise';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
