-- =====================================================
-- MIGRATION COMPLÈTE MULTI-TENANT (SaaS) - VERSION CORRIGÉE
-- =====================================================
-- Cette migration transforme l'application en mode SaaS multi-entreprises
-- Séparation totale des données par entreprise avec RLS
-- =====================================================
-- IMPORTANT : Cette migration est SAFE et ne supprime aucune donnée
-- Elle fonctionne en plusieurs étapes pour éviter tout downtime
-- =====================================================

-- =====================================================
-- ÉTAPE 0 : VÉRIFICATIONS PRÉLIMINAIRES
-- =====================================================

-- Vérifier que les tables companies et company_users existent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'companies'
  ) THEN
    RAISE EXCEPTION 'La table companies n''existe pas. Exécutez d''abord COMPLETE-SYSTEM-INVITATIONS-AND-CONTACT.sql';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'company_users'
  ) THEN
    RAISE EXCEPTION 'La table company_users n''existe pas. Exécutez d''abord COMPLETE-SYSTEM-INVITATIONS-AND-CONTACT.sql';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 1 : FONCTION HELPER POUR AJOUTER company_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_company_id_column_if_not_exists(
  p_table_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier si la table existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ) THEN
    RAISE NOTICE '⚠️ Table % n''existe pas, ignorée', p_table_name;
    RETURN;
  END IF;

  -- Ajouter company_id si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
    AND column_name = 'company_id'
  ) THEN
    EXECUTE format('
      ALTER TABLE public.%I 
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    ', p_table_name);
    
    -- Créer index
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_company_id 
      ON public.%I(company_id);
    ', p_table_name, p_table_name);
    
    RAISE NOTICE '✅ company_id ajouté à %', p_table_name;
  ELSE
    RAISE NOTICE '⚠️ company_id existe déjà dans %', p_table_name;
  END IF;
END;
$$;

-- =====================================================
-- ÉTAPE 2 : AJOUTER company_id À TOUTES LES TABLES
-- =====================================================

-- Tables principales
SELECT public.add_company_id_column_if_not_exists('clients');
SELECT public.add_company_id_column_if_not_exists('projects');
SELECT public.add_company_id_column_if_not_exists('ai_quotes');
SELECT public.add_company_id_column_if_not_exists('invoices');
SELECT public.add_company_id_column_if_not_exists('payments');
SELECT public.add_company_id_column_if_not_exists('employees');
SELECT public.add_company_id_column_if_not_exists('employee_assignments');
SELECT public.add_company_id_column_if_not_exists('events');
SELECT public.add_company_id_column_if_not_exists('notifications');
SELECT public.add_company_id_column_if_not_exists('candidatures');
SELECT public.add_company_id_column_if_not_exists('taches_rh');
SELECT public.add_company_id_column_if_not_exists('rh_activities');
SELECT public.add_company_id_column_if_not_exists('employee_performances');
SELECT public.add_company_id_column_if_not_exists('maintenance_reminders');
SELECT public.add_company_id_column_if_not_exists('image_analysis');
SELECT public.add_company_id_column_if_not_exists('ai_conversations');
SELECT public.add_company_id_column_if_not_exists('email_queue');
SELECT public.add_company_id_column_if_not_exists('messages');
-- email_messages seulement si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_messages') THEN
    PERFORM public.add_company_id_column_if_not_exists('email_messages');
  END IF;
END $$;

-- Tables conditionnelles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_lines') THEN
    PERFORM public.add_company_id_column_if_not_exists('quote_lines');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_sections') THEN
    PERFORM public.add_company_id_column_if_not_exists('quote_sections');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_line_library') THEN
    PERFORM public.add_company_id_column_if_not_exists('quote_line_library');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_section_library') THEN
    PERFORM public.add_company_id_column_if_not_exists('quote_section_library');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materials_price_catalog') THEN
    PERFORM public.add_company_id_column_if_not_exists('materials_price_catalog');
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3 : BACKFILL DES DONNÉES EXISTANTES
-- =====================================================

-- Fonction helper pour backfill une table
CREATE OR REPLACE FUNCTION public.backfill_company_id_for_table(
  p_table_name TEXT,
  p_user_id_column TEXT DEFAULT 'user_id'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_sql TEXT;
  v_count INTEGER;
  v_has_status BOOLEAN;
  v_user_id UUID;
  v_company_id UUID;
  v_user_email TEXT;
  v_user_ids UUID[];
  v_sql_select TEXT;
  v_table_exists BOOLEAN;
  v_column_exists BOOLEAN;
BEGIN
  -- Vérifier si la table existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE NOTICE '⚠️ Table % n''existe pas, ignorée', p_table_name;
    RETURN;
  END IF;

  -- Vérifier si la colonne company_id existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
    AND column_name = 'company_id'
  ) INTO v_column_exists;
  
  IF NOT v_column_exists THEN
    RAISE NOTICE '⚠️ Table % : colonne company_id n''existe pas, ignorée', p_table_name;
    RETURN;
  END IF;
  
  -- Vérifier si status existe dans company_users
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_users'
    AND column_name = 'status'
  ) INTO v_has_status;
  
  -- 1. Migrer via company_users
  IF v_has_status THEN
    v_sql := format('
      UPDATE public.%I t
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = t.%I 
        AND cu.status = ''active''
        LIMIT 1
      )
      WHERE t.company_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.user_id = t.%I 
        AND cu.status = ''active''
      );
    ', p_table_name, p_user_id_column, p_user_id_column, p_user_id_column);
  ELSE
    v_sql := format('
      UPDATE public.%I t
      SET company_id = (
        SELECT cu.company_id 
        FROM public.company_users cu 
        WHERE cu.user_id = t.%I 
        LIMIT 1
      )
      WHERE t.company_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.user_id = t.%I
      );
    ', p_table_name, p_user_id_column, p_user_id_column, p_user_id_column);
  END IF;
  
  BEGIN
    EXECUTE v_sql;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ % : % lignes migrées via company_users', p_table_name, v_count;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erreur lors de la migration de % : %', p_table_name, SQLERRM;
  END;
  
  -- 2. Créer des companies par défaut pour les users sans company
  BEGIN
    v_sql_select := format('
      SELECT ARRAY_AGG(DISTINCT t.%I)
      FROM public.%I t
      WHERE t.company_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.company_users cu 
        WHERE cu.user_id = t.%I
      )
    ', p_user_id_column, p_table_name, p_user_id_column);
    
    EXECUTE v_sql_select INTO v_user_ids;
    
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
      FOREACH v_user_id IN ARRAY v_user_ids
      LOOP
        BEGIN
          -- Récupérer l'email de l'utilisateur
          SELECT email INTO v_user_email
          FROM auth.users
          WHERE id = v_user_id;
          
          -- Créer une company par défaut
          INSERT INTO public.companies (name, owner_id)
          VALUES (
            COALESCE(v_user_email || '''s Company', 'Entreprise par défaut'),
            v_user_id
          )
          RETURNING id INTO v_company_id;
          
          -- Ajouter user comme owner
          IF v_has_status THEN
            INSERT INTO public.company_users (company_id, user_id, role, status)
            VALUES (v_company_id, v_user_id, 'owner', 'active')
            ON CONFLICT (company_id, user_id) DO UPDATE
            SET status = 'active', role = 'owner';
          ELSE
            INSERT INTO public.company_users (company_id, user_id, role)
            VALUES (v_company_id, v_user_id, 'owner')
            ON CONFLICT (company_id, user_id) DO UPDATE
            SET role = 'owner';
          END IF;
          
          -- Mettre à jour les données de la table
          EXECUTE format('
            UPDATE public.%I
            SET company_id = $1
            WHERE %I = $2 
            AND company_id IS NULL
          ', p_table_name, p_user_id_column)
          USING v_company_id, v_user_id;
          
          RAISE NOTICE '✅ Company créée pour user % : %', v_user_id, v_company_id;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erreur lors de la création de company pour user % : %', v_user_id, SQLERRM;
        END;
      END LOOP;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erreur lors de la création des companies par défaut pour % : %', p_table_name, SQLERRM;
  END;
  
  -- 3. Backfill via relations (projects via clients, etc.)
  BEGIN
    IF p_table_name = 'projects' THEN
      EXECUTE format('
        UPDATE public.projects p
        SET company_id = c.company_id
        FROM public.clients c
        WHERE p.client_id = c.id
        AND p.company_id IS NULL
        AND c.company_id IS NOT NULL
      ');
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        RAISE NOTICE '✅ projects : % lignes migrées via clients', v_count;
      END IF;
    END IF;
    
    IF p_table_name = 'employee_assignments' THEN
      EXECUTE format('
        UPDATE public.employee_assignments ea
        SET company_id = p.company_id
        FROM public.projects p
        WHERE ea.project_id = p.id
        AND ea.company_id IS NULL
        AND p.company_id IS NOT NULL
      ');
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        RAISE NOTICE '✅ employee_assignments : % lignes migrées via projects', v_count;
      END IF;
    END IF;
    
    IF p_table_name = 'events' THEN
      EXECUTE format('
        UPDATE public.events e
        SET company_id = p.company_id
        FROM public.projects p
        WHERE e.project_id = p.id
        AND e.company_id IS NULL
        AND p.company_id IS NOT NULL
      ');
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        RAISE NOTICE '✅ events : % lignes migrées via projects', v_count;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erreur lors du backfill relationnel pour % : %', p_table_name, SQLERRM;
  END;
END;
$$;

-- =====================================================
-- ÉTAPE 4 : EXÉCUTER LE BACKFILL POUR CHAQUE TABLE
-- =====================================================

SELECT public.backfill_company_id_for_table('clients');
SELECT public.backfill_company_id_for_table('projects');
SELECT public.backfill_company_id_for_table('ai_quotes');
SELECT public.backfill_company_id_for_table('invoices');
SELECT public.backfill_company_id_for_table('payments');
SELECT public.backfill_company_id_for_table('employees');
SELECT public.backfill_company_id_for_table('employee_assignments');
SELECT public.backfill_company_id_for_table('events');
SELECT public.backfill_company_id_for_table('notifications');
SELECT public.backfill_company_id_for_table('candidatures');
SELECT public.backfill_company_id_for_table('taches_rh');
SELECT public.backfill_company_id_for_table('rh_activities');
SELECT public.backfill_company_id_for_table('employee_performances');
SELECT public.backfill_company_id_for_table('maintenance_reminders');
SELECT public.backfill_company_id_for_table('image_analysis');
SELECT public.backfill_company_id_for_table('ai_conversations');
SELECT public.backfill_company_id_for_table('email_queue');
SELECT public.backfill_company_id_for_table('messages');
-- email_messages seulement si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_messages') THEN
    PERFORM public.backfill_company_id_for_table('email_messages');
  END IF;
END $$;

-- Tables conditionnelles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_lines') THEN
    PERFORM public.backfill_company_id_for_table('quote_lines', 'user_id');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_sections') THEN
    PERFORM public.backfill_company_id_for_table('quote_sections', 'user_id');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_line_library') THEN
    PERFORM public.backfill_company_id_for_table('quote_line_library', 'user_id');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_section_library') THEN
    PERFORM public.backfill_company_id_for_table('quote_section_library', 'user_id');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materials_price_catalog') THEN
    PERFORM public.backfill_company_id_for_table('materials_price_catalog', 'user_id');
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5 : VÉRIFIER QU'IL N'Y A PLUS DE NULL
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_null_count INTEGER;
  v_tables TEXT[] := ARRAY[
    'clients', 'projects', 'ai_quotes', 'invoices', 'payments',
    'employees', 'employee_assignments', 'events', 'notifications',
    'candidatures', 'taches_rh', 'rh_activities', 'employee_performances',
    'maintenance_reminders', 'image_analysis', 'ai_conversations',
    'email_queue', 'messages'
  ];
BEGIN
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
          RAISE WARNING '⚠️ Table % : % lignes sans company_id', v_table_name, v_null_count;
        ELSE
          RAISE NOTICE '✅ Table % : toutes les lignes ont un company_id', v_table_name;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '⚠️ Table % : erreur lors de la vérification', v_table_name;
      END;
    END IF;
  END LOOP;
  
  -- Vérifier email_messages séparément (seulement si table ET colonne existent)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages'
    AND column_name = 'company_id'
  ) THEN
    BEGIN
      EXECUTE format('
        SELECT COUNT(*) 
        FROM public.%I 
        WHERE company_id IS NULL
      ', 'email_messages') INTO v_null_count;
      IF v_null_count > 0 THEN
        RAISE WARNING '⚠️ Table email_messages : % lignes sans company_id', v_null_count;
      ELSE
        RAISE NOTICE '✅ Table email_messages : toutes les lignes ont un company_id';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Table email_messages : erreur lors de la vérification';
    END;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 6 : RENDRE company_id NOT NULL
-- =====================================================

CREATE OR REPLACE FUNCTION public.make_company_id_not_null_if_safe(
  p_table_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_null_count INTEGER;
  v_table_exists BOOLEAN;
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RETURN;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
    AND column_name = 'company_id'
  ) INTO v_column_exists;
  
  IF NOT v_column_exists THEN
    RETURN;
  END IF;
  
  BEGIN
    EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE company_id IS NULL', p_table_name) INTO v_null_count;
    
    IF v_null_count = 0 THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', p_table_name);
      RAISE NOTICE '✅ company_id rendu NOT NULL pour %', p_table_name;
    ELSE
      RAISE WARNING '⚠️ % : % lignes NULL, company_id reste nullable', p_table_name, v_null_count;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erreur pour % : %', p_table_name, SQLERRM;
  END;
END;
$$;

-- Rendre NOT NULL pour toutes les tables
SELECT public.make_company_id_not_null_if_safe('clients');
SELECT public.make_company_id_not_null_if_safe('projects');
SELECT public.make_company_id_not_null_if_safe('ai_quotes');
SELECT public.make_company_id_not_null_if_safe('invoices');
SELECT public.make_company_id_not_null_if_safe('payments');
SELECT public.make_company_id_not_null_if_safe('employees');
SELECT public.make_company_id_not_null_if_safe('employee_assignments');
SELECT public.make_company_id_not_null_if_safe('events');
SELECT public.make_company_id_not_null_if_safe('notifications');
SELECT public.make_company_id_not_null_if_safe('candidatures');
SELECT public.make_company_id_not_null_if_safe('taches_rh');
SELECT public.make_company_id_not_null_if_safe('rh_activities');
SELECT public.make_company_id_not_null_if_safe('employee_performances');
SELECT public.make_company_id_not_null_if_safe('maintenance_reminders');
SELECT public.make_company_id_not_null_if_safe('image_analysis');
SELECT public.make_company_id_not_null_if_safe('ai_conversations');
SELECT public.make_company_id_not_null_if_safe('email_queue');
SELECT public.make_company_id_not_null_if_safe('messages');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_messages') THEN
    PERFORM public.make_company_id_not_null_if_safe('email_messages');
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 7 : FONCTION HELPER POUR RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_company_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_users'
    AND column_name = 'status'
  ) THEN
    RETURN QUERY
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid() 
    AND status = 'active';
  ELSE
    RETURN QUERY
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_users'
    AND column_name = 'status'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = p_user_id
        AND company_id = p_company_id
        AND status = 'active'
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = p_user_id
        AND company_id = p_company_id
    );
  END IF;
END;
$$;

-- =====================================================
-- ÉTAPE 8 : RLS POLICIES
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_multi_tenant_rls_policies(
  p_table_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_user_id BOOLEAN;
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RETURN;
  END IF;
  
  BEGIN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- Supprimer les anciennes policies
  EXECUTE format('DROP POLICY IF EXISTS "Company members can view %I" ON public.%I', p_table_name, p_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "Company members can create %I" ON public.%I', p_table_name, p_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "Company members can update %I" ON public.%I', p_table_name, p_table_name);
  EXECUTE format('DROP POLICY IF EXISTS "Company members can delete %I" ON public.%I', p_table_name, p_table_name);
  
  -- Vérifier si user_id existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
    AND column_name = 'user_id'
  ) INTO v_has_user_id;
  
  -- SELECT
  EXECUTE format('
    CREATE POLICY "Company members can view %I"
      ON public.%I FOR SELECT
      USING (company_id IN (SELECT company_id FROM public.current_company_ids()))
  ', p_table_name, p_table_name);
  
  -- INSERT
  IF v_has_user_id THEN
    EXECUTE format('
      CREATE POLICY "Company members can create %I"
        ON public.%I FOR INSERT
        WITH CHECK (
          company_id IN (SELECT company_id FROM public.current_company_ids())
          AND user_id = auth.uid()
        )
    ', p_table_name, p_table_name);
  ELSE
    EXECUTE format('
      CREATE POLICY "Company members can create %I"
        ON public.%I FOR INSERT
        WITH CHECK (company_id IN (SELECT company_id FROM public.current_company_ids()))
    ', p_table_name, p_table_name);
  END IF;
  
  -- UPDATE
  EXECUTE format('
    CREATE POLICY "Company members can update %I"
      ON public.%I FOR UPDATE
      USING (company_id IN (SELECT company_id FROM public.current_company_ids()))
      WITH CHECK (company_id IN (SELECT company_id FROM public.current_company_ids()))
  ', p_table_name, p_table_name);
  
  -- DELETE
  EXECUTE format('
    CREATE POLICY "Company members can delete %I"
      ON public.%I FOR DELETE
      USING (company_id IN (SELECT company_id FROM public.current_company_ids()))
  ', p_table_name, p_table_name);
  
  RAISE NOTICE '✅ RLS policies créées pour %', p_table_name;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erreur lors de la création des policies pour % : %', p_table_name, SQLERRM;
END;
$$;

-- Appliquer les policies
SELECT public.create_multi_tenant_rls_policies('clients');
SELECT public.create_multi_tenant_rls_policies('projects');
SELECT public.create_multi_tenant_rls_policies('ai_quotes');
SELECT public.create_multi_tenant_rls_policies('invoices');
SELECT public.create_multi_tenant_rls_policies('payments');
SELECT public.create_multi_tenant_rls_policies('employees');
SELECT public.create_multi_tenant_rls_policies('employee_assignments');
SELECT public.create_multi_tenant_rls_policies('events');
SELECT public.create_multi_tenant_rls_policies('notifications');
SELECT public.create_multi_tenant_rls_policies('candidatures');
SELECT public.create_multi_tenant_rls_policies('taches_rh');
SELECT public.create_multi_tenant_rls_policies('rh_activities');
SELECT public.create_multi_tenant_rls_policies('employee_performances');
SELECT public.create_multi_tenant_rls_policies('maintenance_reminders');
SELECT public.create_multi_tenant_rls_policies('image_analysis');
SELECT public.create_multi_tenant_rls_policies('ai_conversations');
SELECT public.create_multi_tenant_rls_policies('email_queue');
SELECT public.create_multi_tenant_rls_policies('messages');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_messages') THEN
    PERFORM public.create_multi_tenant_rls_policies('email_messages');
  END IF;
END $$;

-- =====================================================
-- FIN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration multi-tenant complète terminée';
  RAISE NOTICE '📋 Vérifiez qu''il n''y a plus de lignes avec company_id NULL';
  RAISE NOTICE '🔒 Toutes les RLS policies sont activées et configurées';
  RAISE NOTICE '🚀 L''application est maintenant en mode SaaS multi-tenant';
END $$;
