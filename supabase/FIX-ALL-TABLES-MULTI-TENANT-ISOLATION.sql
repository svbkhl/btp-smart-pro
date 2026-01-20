-- =====================================================
-- MIGRATION CRITIQUE : Isolation stricte de TOUTES les données par entreprise
-- =====================================================
-- Ce script isole STRICTEMENT toutes les tables métier par entreprise.
-- Impossible de voir/modifier les données d'une autre entreprise.
-- 
-- TABLES TRAITÉES :
-- - clients, projects, ai_quotes, invoices, payments
-- - employees, events, notifications, messages
-- - candidatures, taches_rh, rh_activities, employee_performances
-- - maintenance_reminders, ai_conversations, ai_messages
-- - quote_lines, quote_sections, quote_line_library, quote_section_library (si existent)
-- =====================================================

-- =====================================================
-- 1. FONCTION HELPER : current_company_id()
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

-- =====================================================
-- 2. FONCTION GÉNÉRIQUE : force_company_id()
-- =====================================================

CREATE OR REPLACE FUNCTION public.force_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := public.current_company_id();
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de déterminer company_id. L''utilisateur doit être membre d''une entreprise.';
  END IF;
  
  -- Forcer company_id (ignorer toute valeur venant du frontend)
  NEW.company_id := v_company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. LISTE DES TABLES À ISOLER
-- =====================================================

DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'clients',
    'projects',
    'ai_quotes',
    'invoices',
    'payments',
    'employees',
    'events',
    'notifications',
    'messages',
    'candidatures',
    'taches_rh',
    'rh_activities',
    'employee_performances',
    'maintenance_reminders',
    'ai_conversations',
    'ai_messages',
    'image_analysis',
    'employee_assignments',
    'quote_lines',
    'quote_sections',
    'quote_line_library',
    'quote_section_library'
  ];
  v_table TEXT;
  v_table_exists BOOLEAN;
  v_column_exists BOOLEAN;
  v_has_null BOOLEAN;
  v_migrated_count INTEGER;
  v_deleted_count INTEGER;
  v_constraint_name TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    -- Vérifier si la table existe
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
      RAISE NOTICE 'ℹ️ Table % n''existe pas - ignorée', v_table;
      CONTINUE;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 Traitement de la table: %', v_table;
    
    -- 3.1 Ajouter company_id si manquant
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = v_table 
      AND column_name = 'company_id'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id UUID', v_table);
      
      RAISE NOTICE '✅ Colonne company_id ajoutée';
    ELSE
      RAISE NOTICE 'ℹ️ Colonne company_id existe déjà';
    END IF;
    
    -- 3.2 Ajouter Foreign Key si manquante
    v_constraint_name := v_table || '_company_id_fkey';
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = v_table 
      AND constraint_name = v_constraint_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE', 
        v_table, v_constraint_name);
      
      RAISE NOTICE '✅ Foreign key ajoutée';
    ELSE
      RAISE NOTICE 'ℹ️ Foreign key existe déjà';
    END IF;
    
    -- 3.3 Créer index si manquant
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_company_id ON public.%I(company_id)', 
      v_table, v_table);
    
    -- 3.4 Migrer les données existantes
    EXECUTE format('
      UPDATE public.%I t
      SET company_id = (
        SELECT cu.company_id
        FROM public.company_users cu
        WHERE cu.user_id = t.user_id
        ORDER BY CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = ''public'' 
            AND table_name = ''company_users'' 
            AND column_name = ''status''
          ) AND cu.status = ''active'' THEN 0
          ELSE 1
        END
        LIMIT 1
      )
      WHERE t.company_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = t.user_id
      )', v_table);
    
    GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
    IF v_migrated_count > 0 THEN
      RAISE NOTICE '✅ % ligne(s) migrée(s)', v_migrated_count;
    END IF;
    
    -- 3.5 Supprimer les données sans entreprise (sécurité)
    EXECUTE format('DELETE FROM public.%I WHERE company_id IS NULL', v_table);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
      RAISE NOTICE '⚠️ % ligne(s) sans entreprise supprimée(s)', v_deleted_count;
    END IF;
    
    -- 3.6 Passer company_id en NOT NULL si possible
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE company_id IS NULL)', v_table) INTO v_has_null;
    
    IF NOT v_has_null THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', v_table);
      RAISE NOTICE '✅ company_id est maintenant NOT NULL';
    ELSE
      RAISE WARNING '⚠️ Il reste des NULL - ne peut pas passer en NOT NULL';
    END IF;
    
    -- 3.7 Supprimer les anciens triggers
    EXECUTE format('DROP TRIGGER IF EXISTS force_company_id_%I_trigger ON public.%I', v_table, v_table);
    
    -- 3.8 Créer le trigger BEFORE INSERT
    EXECUTE format('
      CREATE TRIGGER force_company_id_%I_trigger
      BEFORE INSERT ON public.%I
      FOR EACH ROW
      EXECUTE FUNCTION public.force_company_id()', v_table, v_table);
    
    RAISE NOTICE '✅ Trigger créé';
    
    -- 3.9 Activer RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    
    -- 3.10 Supprimer toutes les anciennes policies
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON public.%I;
      DROP POLICY IF EXISTS %I ON public.%I;
      DROP POLICY IF EXISTS %I ON public.%I;
      DROP POLICY IF EXISTS %I ON public.%I;
      DROP POLICY IF EXISTS %I ON public.%I;
      DROP POLICY IF EXISTS %I ON public.%I;
      DROP POLICY IF EXISTS %I ON public.%I;
      DROP POLICY IF EXISTS %I ON public.%I;',
      v_table || '_select_policy', v_table,
      v_table || '_insert_policy', v_table,
      v_table || '_update_policy', v_table,
      v_table || '_delete_policy', v_table,
      'Users can view their own ' || v_table, v_table,
      'Users can create their own ' || v_table, v_table,
      'Users can update their own ' || v_table, v_table,
      'Users can delete their own ' || v_table, v_table);
    
    -- 3.11 Créer les policies RLS strictes
    EXECUTE format('
      CREATE POLICY "%I_select_company_isolation"
      ON public.%I FOR SELECT
      USING (
        company_id = public.current_company_id()
        AND EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
          AND cu.company_id = public.%I.company_id
        )
      )', v_table, v_table, v_table);
    
    EXECUTE format('
      CREATE POLICY "%I_insert_company_isolation"
      ON public.%I FOR INSERT
      WITH CHECK (
        company_id = public.current_company_id()
        AND EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
          AND cu.company_id = company_id
        )
      )', v_table, v_table);
    
    EXECUTE format('
      CREATE POLICY "%I_update_company_isolation"
      ON public.%I FOR UPDATE
      USING (
        company_id = public.current_company_id()
        AND EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
          AND cu.company_id = public.%I.company_id
        )
      )
      WITH CHECK (
        company_id = public.current_company_id()
        AND EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
          AND cu.company_id = company_id
        )
      )', v_table, v_table, v_table);
    
    EXECUTE format('
      CREATE POLICY "%I_delete_company_isolation"
      ON public.%I FOR DELETE
      USING (
        company_id = public.current_company_id()
        AND EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
          AND cu.company_id = public.%I.company_id
        )
      )', v_table, v_table, v_table);
    
    RAISE NOTICE '✅ Policies RLS créées';
    
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ ISOLATION COMPLÈTE TERMINÉE';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Toutes les tables sont maintenant strictement isolées par entreprise';
  RAISE NOTICE '🔒 Impossible de voir/modifier les données d''une autre entreprise';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 4. VÉRIFICATIONS FINALES
-- =====================================================

-- Vérifier qu'il n'y a plus de NULL company_id
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['clients', 'projects', 'ai_quotes', 'invoices', 'payments', 'employees', 'events', 'notifications', 'messages'];
  v_table TEXT;
  v_null_count INTEGER;
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table
    ) THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE company_id IS NULL', v_table) INTO v_null_count;
      IF v_null_count > 0 THEN
        RAISE WARNING '⚠️ Table % : % lignes avec company_id NULL', v_table, v_null_count;
      ELSE
        RAISE NOTICE '✅ Table % : Aucun NULL', v_table;
      END IF;
    END IF;
  END LOOP;
END $$;
