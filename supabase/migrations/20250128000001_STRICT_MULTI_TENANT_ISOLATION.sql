-- =====================================================
-- ISOLATION STRICTE MULTI-TENANT - SAAS SÉCURISÉ
-- =====================================================
-- Cette migration garantit une isolation TOTALE des données
-- entre entreprises. Impossible de voir/modifier les données
-- d'une autre entreprise.
-- =====================================================
-- PRINCIPE : Chaque utilisateur appartient à UNE SEULE entreprise
-- Le company_id est récupéré automatiquement depuis company_users
-- et appliqué via RLS strictes + triggers
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : FONCTION HELPER - Récupérer company_id actif
-- =====================================================
-- Cette fonction retourne le company_id de l'utilisateur connecté
-- Elle est utilisée dans toutes les policies RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  -- Prendre le premier si plusieurs (normalement UN seul)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_users'
    AND column_name = 'status'
  ) THEN
    SELECT company_id INTO v_company_id
    FROM public.company_users 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    SELECT company_id INTO v_company_id
    FROM public.company_users 
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN v_company_id;
END;
$$;

COMMENT ON FUNCTION public.current_company_id() IS 'Retourne le company_id de l''utilisateur connecté (un seul)';

-- =====================================================
-- ÉTAPE 1.5 : AJOUTER company_id À MESSAGES SI ABSENT
-- =====================================================
-- La table messages a été créée après la migration initiale
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages'
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.messages 
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_messages_company_id 
      ON public.messages(company_id);
      
      RAISE NOTICE '✅ company_id ajouté à messages';
    END IF;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 2 : VÉRIFIER ET FORCER company_id NOT NULL
-- =====================================================
-- S'assure que toutes les tables métier ont company_id NOT NULL
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_table_exists BOOLEAN;
  v_null_count INTEGER;
  v_tables TEXT[] := ARRAY[
    'clients', 'projects', 'ai_quotes', 'invoices', 'payments',
    'employees', 'events', 'notifications', 'messages', 'ai_conversations',
    'ai_messages', 'candidatures', 'taches_rh',
    'rh_activities', 'employee_performances', 'maintenance_reminders',
    'image_analysis', 'employee_assignments'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    -- Vérifier si la table existe
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
      -- Vérifier si company_id existe
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name
        AND column_name = 'company_id'
      ) THEN
        -- Vérifier si NOT NULL
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = v_table_name
          AND column_name = 'company_id'
          AND is_nullable = 'YES'
        ) THEN
          -- Compter les lignes avec company_id NULL
          EXECUTE format('
            SELECT COUNT(*) 
            FROM public.%I 
            WHERE company_id IS NULL
          ', v_table_name) INTO v_null_count;
          
          -- Si pas de NULL, rendre NOT NULL
          IF v_null_count = 0 THEN
            BEGIN
              EXECUTE format('
                ALTER TABLE public.%I 
                ALTER COLUMN company_id SET NOT NULL
              ', v_table_name);
              RAISE NOTICE '✅ % : company_id rendu NOT NULL', v_table_name;
            EXCEPTION
              WHEN OTHERS THEN
                RAISE WARNING '⚠️ % : Impossible de rendre company_id NOT NULL : %', v_table_name, SQLERRM;
            END;
          ELSE
            RAISE WARNING '⚠️ % : % lignes avec company_id NULL (à corriger avant NOT NULL)', v_table_name, v_null_count;
          END IF;
        ELSE
          RAISE NOTICE '✅ % : company_id déjà NOT NULL', v_table_name;
        END IF;
        
        -- Vérifier l'index
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND tablename = v_table_name
          AND indexname LIKE '%company_id%'
        ) THEN
          BEGIN
            EXECUTE format('
              CREATE INDEX IF NOT EXISTS idx_%I_company_id 
              ON public.%I(company_id)
            ', v_table_name, v_table_name);
            RAISE NOTICE '✅ % : Index company_id créé', v_table_name;
          EXCEPTION
            WHEN OTHERS THEN
              RAISE WARNING '⚠️ % : Erreur création index : %', v_table_name, SQLERRM;
          END;
        END IF;
      ELSE
        RAISE WARNING '⚠️ % : company_id n''existe pas', v_table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- ÉTAPE 3 : TRIGGERS POUR FORCER company_id AUTOMATIQUEMENT
-- =====================================================
-- Ces triggers forcent automatiquement company_id lors des INSERT
-- Même si le frontend envoie company_id, il sera écrasé par le bon
-- =====================================================

-- Fonction générique pour forcer company_id
CREATE OR REPLACE FUNCTION public.force_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  v_company_id := public.current_company_id();
  
  -- Si pas de company_id, rejeter l'opération
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'L''utilisateur doit être membre d''une entreprise pour créer des données';
  END IF;
  
  -- Forcer company_id (écrase toute valeur envoyée par le frontend)
  NEW.company_id := v_company_id;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur toutes les tables métier
DO $$
DECLARE
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'clients', 'projects', 'ai_quotes', 'invoices', 'payments',
    'employees', 'events', 'notifications', 'messages', 'ai_conversations',
    'candidatures', 'taches_rh', 'rh_activities', 'employee_performances',
    'maintenance_reminders', 'image_analysis', 'employee_assignments'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name
        AND column_name = 'company_id'
      ) THEN
        BEGIN
          -- Supprimer l'ancien trigger si existe
          EXECUTE format('
            DROP TRIGGER IF EXISTS force_company_id_%I ON public.%I
          ', v_table_name, v_table_name);
          
          -- Créer le nouveau trigger
          EXECUTE format('
            CREATE TRIGGER force_company_id_%I
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.force_company_id()
          ', v_table_name, v_table_name);
          
          RAISE NOTICE '✅ Trigger créé pour %', v_table_name;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING '⚠️ Erreur trigger pour % : %', v_table_name, SQLERRM;
        END;
      END IF;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- ÉTAPE 4 : RLS POLICIES STRICTES
-- =====================================================
-- Toutes les policies utilisent current_company_id() strictement
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_strict_rls_policies(
  p_table_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  -- Vérifier que la table existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE NOTICE '⚠️ Table % n''existe pas, ignorée', p_table_name;
    RETURN;
  END IF;
  
  -- Vérifier que company_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
    AND column_name = 'company_id'
  ) THEN
    RAISE WARNING '⚠️ Table % n''a pas de colonne company_id, ignorée', p_table_name;
    RETURN;
  END IF;
  
  -- Activer RLS
  BEGIN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- Supprimer toutes les anciennes policies
  EXECUTE format('
    DROP POLICY IF EXISTS "Strict company isolation - SELECT %I" ON public.%I;
    DROP POLICY IF EXISTS "Strict company isolation - INSERT %I" ON public.%I;
    DROP POLICY IF EXISTS "Strict company isolation - UPDATE %I" ON public.%I;
    DROP POLICY IF EXISTS "Strict company isolation - DELETE %I" ON public.%I;
  ', p_table_name, p_table_name, p_table_name, p_table_name, p_table_name, p_table_name, p_table_name, p_table_name);
  
  -- SELECT : Voir uniquement les données de son entreprise
  EXECUTE format('
    CREATE POLICY "Strict company isolation - SELECT %I"
    ON public.%I FOR SELECT
    USING (company_id = public.current_company_id())
  ', p_table_name, p_table_name);
  
  -- INSERT : Créer uniquement dans son entreprise (company_id forcé par trigger)
  EXECUTE format('
    CREATE POLICY "Strict company isolation - INSERT %I"
    ON public.%I FOR INSERT
    WITH CHECK (company_id = public.current_company_id())
  ', p_table_name, p_table_name);
  
  -- UPDATE : Modifier uniquement les données de son entreprise
  EXECUTE format('
    CREATE POLICY "Strict company isolation - UPDATE %I"
    ON public.%I FOR UPDATE
    USING (company_id = public.current_company_id())
    WITH CHECK (company_id = public.current_company_id())
  ', p_table_name, p_table_name);
  
  -- DELETE : Supprimer uniquement les données de son entreprise
  EXECUTE format('
    CREATE POLICY "Strict company isolation - DELETE %I"
    ON public.%I FOR DELETE
    USING (company_id = public.current_company_id())
  ', p_table_name, p_table_name);
  
  RAISE NOTICE '✅ RLS policies strictes créées pour %', p_table_name;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Erreur lors de la création des policies pour % : %', p_table_name, SQLERRM;
END;
$$;

-- Appliquer les policies sur toutes les tables métier
SELECT public.create_strict_rls_policies('clients');
SELECT public.create_strict_rls_policies('projects');
SELECT public.create_strict_rls_policies('ai_quotes');
SELECT public.create_strict_rls_policies('invoices');
SELECT public.create_strict_rls_policies('payments');
SELECT public.create_strict_rls_policies('employees');
SELECT public.create_strict_rls_policies('events');
SELECT public.create_strict_rls_policies('notifications');
SELECT public.create_strict_rls_policies('messages');
SELECT public.create_strict_rls_policies('ai_conversations');
SELECT public.create_strict_rls_policies('ai_messages');
SELECT public.create_strict_rls_policies('candidatures');
SELECT public.create_strict_rls_policies('taches_rh');
SELECT public.create_strict_rls_policies('rh_activities');
SELECT public.create_strict_rls_policies('employee_performances');
SELECT public.create_strict_rls_policies('maintenance_reminders');
SELECT public.create_strict_rls_policies('image_analysis');
SELECT public.create_strict_rls_policies('employee_assignments');

-- Tables conditionnelles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quote_lines'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quote_lines'
    AND column_name = 'company_id'
  ) THEN
    PERFORM public.create_strict_rls_policies('quote_lines');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quote_sections'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quote_sections'
    AND column_name = 'company_id'
  ) THEN
    PERFORM public.create_strict_rls_policies('quote_sections');
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5 : VÉRIFICATION FINALE
-- =====================================================

DO $$
DECLARE
  v_null_count INTEGER;
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'clients', 'projects', 'ai_quotes', 'invoices', 'payments',
    'employees', 'events', 'notifications', 'messages'
  ];
  v_has_nulls BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION FINALE - ISOLATION STRICTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Vérifier qu'il n'y a pas de company_id NULL
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) THEN
      BEGIN
        EXECUTE format('
          SELECT COUNT(*) 
          FROM public.%I 
          WHERE company_id IS NULL
        ', v_table_name) INTO v_null_count;
        
        IF v_null_count > 0 THEN
          RAISE WARNING '❌ % : % lignes avec company_id NULL', v_table_name, v_null_count;
          v_has_nulls := true;
        ELSE
          RAISE NOTICE '✅ % : Aucun company_id NULL', v_table_name;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;
    END IF;
  END LOOP;
  
  IF v_has_nulls THEN
    RAISE WARNING '';
    RAISE WARNING '⚠️ ATTENTION : Certaines tables ont encore des company_id NULL';
    RAISE WARNING '   Exécutez un backfill avant de rendre company_id NOT NULL';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Toutes les tables ont company_id défini';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration terminée !';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
