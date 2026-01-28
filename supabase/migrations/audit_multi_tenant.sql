-- ============================================================================
-- SCRIPT D'AUDIT ET MIGRATION MULTI-TENANT AUTOMATIQUE
-- ============================================================================
-- 
-- Ce script effectue un audit complet de toutes les tables métier et génère
-- automatiquement les migrations SQL nécessaires pour implémenter l'isolation
-- multi-tenant via company_id + RLS.
--
-- USAGE:
-- 1. Exécuter ce script dans Supabase SQL Editor
-- 2. Le script génère des commandes SQL dans les RAISE NOTICE
-- 3. Copier/coller les commandes générées pour les exécuter
--
-- ATTENTION: Ce script est IDEMPOTENT et peut être exécuté plusieurs fois.
--
-- Créé le: 2026-01-23
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    has_company_id BOOLEAN;
    has_fk BOOLEAN;
    has_rls BOOLEAN;
    policy_count INTEGER;
    migration_sql TEXT := '';
    audit_log TEXT := '';
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 AUDIT MULTI-TENANT - Démarrage';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- ========================================================================
    -- ÉTAPE 1: LISTER TOUTES LES TABLES MÉTIER
    -- ========================================================================
    RAISE NOTICE '📊 ÉTAPE 1: Scan des tables métier...';
    RAISE NOTICE '';

    FOR table_record IN
        SELECT 
            schemaname,
            tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE 'sql_%'
          AND tablename != 'schema_migrations'
        ORDER BY tablename
    LOOP
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '🔍 TABLE: %.%', table_record.schemaname, table_record.tablename;
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

        -- ====================================================================
        -- ÉTAPE 2: VÉRIFIER LA PRÉSENCE DE company_id
        -- ====================================================================
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = table_record.schemaname
              AND table_name = table_record.tablename
              AND column_name = 'company_id'
        ) INTO has_company_id;

        IF has_company_id THEN
            RAISE NOTICE '✅ Colonne company_id: PRÉSENTE';
        ELSE
            RAISE NOTICE '❌ Colonne company_id: ABSENTE';
            RAISE NOTICE '';
            RAISE NOTICE '🔧 MIGRATION NÉCESSAIRE:';
            RAISE NOTICE '-- Ajouter la colonne company_id';
            RAISE NOTICE 'ALTER TABLE %.% ADD COLUMN IF NOT EXISTS company_id UUID;', 
                table_record.schemaname, table_record.tablename;
            RAISE NOTICE '';
        END IF;

        -- ====================================================================
        -- ÉTAPE 3: VÉRIFIER LA FOREIGN KEY vers companies
        -- ====================================================================
        IF has_company_id THEN
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                WHERE tc.table_schema = table_record.schemaname
                  AND tc.table_name = table_record.tablename
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND ccu.column_name = 'company_id'
                  AND ccu.table_name = 'companies'
            ) INTO has_fk;

            IF has_fk THEN
                RAISE NOTICE '✅ Foreign Key vers companies: PRÉSENTE';
            ELSE
                RAISE NOTICE '❌ Foreign Key vers companies: ABSENTE';
                RAISE NOTICE '';
                RAISE NOTICE '🔧 MIGRATION NÉCESSAIRE:';
                RAISE NOTICE '-- Ajouter la contrainte FK';
                RAISE NOTICE 'ALTER TABLE %.% ADD CONSTRAINT IF NOT EXISTS fk_%_company_id',
                    table_record.schemaname, table_record.tablename, table_record.tablename;
                RAISE NOTICE '  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;';
                RAISE NOTICE '';
            END IF;

            -- Vérifier l'index sur company_id
            IF NOT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = table_record.schemaname
                  AND tablename = table_record.tablename
                  AND indexname LIKE '%company_id%'
            ) THEN
                RAISE NOTICE '⚠️  Index sur company_id: ABSENT';
                RAISE NOTICE '';
                RAISE NOTICE '🔧 MIGRATION NÉCESSAIRE:';
                RAISE NOTICE '-- Créer un index sur company_id pour les performances';
                RAISE NOTICE 'CREATE INDEX IF NOT EXISTS idx_%_company_id ON %.% (company_id);',
                    table_record.tablename, table_record.schemaname, table_record.tablename;
                RAISE NOTICE '';
            ELSE
                RAISE NOTICE '✅ Index sur company_id: PRÉSENT';
            END IF;
        END IF;

        -- ====================================================================
        -- ÉTAPE 4: VÉRIFIER RLS
        -- ====================================================================
        SELECT relrowsecurity
        FROM pg_class
        WHERE oid = (table_record.schemaname || '.' || table_record.tablename)::regclass
        INTO has_rls;

        IF has_rls THEN
            RAISE NOTICE '✅ RLS (Row Level Security): ACTIVÉ';
        ELSE
            RAISE NOTICE '❌ RLS (Row Level Security): DÉSACTIVÉ';
            RAISE NOTICE '';
            RAISE NOTICE '🔧 MIGRATION NÉCESSAIRE:';
            RAISE NOTICE '-- Activer RLS';
            RAISE NOTICE 'ALTER TABLE %.% ENABLE ROW LEVEL SECURITY;',
                table_record.schemaname, table_record.tablename;
            RAISE NOTICE 'ALTER TABLE %.% FORCE ROW LEVEL SECURITY;',
                table_record.schemaname, table_record.tablename;
            RAISE NOTICE '';
        END IF;

        -- ====================================================================
        -- ÉTAPE 5: VÉRIFIER LES POLICIES
        -- ====================================================================
        SELECT COUNT(*)
        FROM pg_policies
        WHERE schemaname = table_record.schemaname
          AND tablename = table_record.tablename
        INTO policy_count;

        RAISE NOTICE 'ℹ️  Policies RLS: % trouvée(s)', policy_count;

        IF policy_count = 0 AND has_company_id THEN
            RAISE NOTICE '';
            RAISE NOTICE '🔧 MIGRATION NÉCESSAIRE:';
            RAISE NOTICE '-- Créer les 4 policies standards (SELECT, INSERT, UPDATE, DELETE)';
            RAISE NOTICE '';
            
            -- Policy SELECT
            RAISE NOTICE '-- Policy SELECT';
            RAISE NOTICE 'CREATE POLICY "select_own_company_%s" ON %.%', 
                table_record.tablename, table_record.schemaname, table_record.tablename;
            RAISE NOTICE '  FOR SELECT';
            RAISE NOTICE '  USING (company_id = (auth.jwt()->>''company_id'')::uuid);';
            RAISE NOTICE '';
            
            -- Policy INSERT
            RAISE NOTICE '-- Policy INSERT';
            RAISE NOTICE 'CREATE POLICY "insert_own_company_%s" ON %.%',
                table_record.tablename, table_record.schemaname, table_record.tablename;
            RAISE NOTICE '  FOR INSERT';
            RAISE NOTICE '  WITH CHECK (company_id = (auth.jwt()->>''company_id'')::uuid);';
            RAISE NOTICE '';
            
            -- Policy UPDATE
            RAISE NOTICE '-- Policy UPDATE';
            RAISE NOTICE 'CREATE POLICY "update_own_company_%s" ON %.%',
                table_record.tablename, table_record.schemaname, table_record.tablename;
            RAISE NOTICE '  FOR UPDATE';
            RAISE NOTICE '  USING (company_id = (auth.jwt()->>''company_id'')::uuid)';
            RAISE NOTICE '  WITH CHECK (company_id = (auth.jwt()->>''company_id'')::uuid);';
            RAISE NOTICE '';
            
            -- Policy DELETE
            RAISE NOTICE '-- Policy DELETE';
            RAISE NOTICE 'CREATE POLICY "delete_own_company_%s" ON %.%',
                table_record.tablename, table_record.schemaname, table_record.tablename;
            RAISE NOTICE '  FOR DELETE';
            RAISE NOTICE '  USING (company_id = (auth.jwt()->>''company_id'')::uuid);';
            RAISE NOTICE '';
        ELSIF policy_count > 0 THEN
            -- Lister les policies existantes
            RAISE NOTICE '';
            RAISE NOTICE '📝 Policies existantes:';
            FOR policy_record IN
                SELECT policyname, cmd, qual, with_check
                FROM pg_policies
                WHERE schemaname = table_record.schemaname
                  AND tablename = table_record.tablename
            LOOP
                RAISE NOTICE '   - % (FOR %)', policy_record.policyname, policy_record.cmd;
            END LOOP;
        END IF;

        RAISE NOTICE '';
    END LOOP;

    -- ========================================================================
    -- ÉTAPE 6: RÉSUMÉ ET RECOMMANDATIONS
    -- ========================================================================
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 RÉSUMÉ DE L''AUDIT';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Audit terminé avec succès';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PROCHAINES ÉTAPES:';
    RAISE NOTICE '';
    RAISE NOTICE '1. ⚠️  Copier toutes les commandes SQL "🔧 MIGRATION NÉCESSAIRE"';
    RAISE NOTICE '2. 📝 Créer un nouveau fichier de migration SQL';
    RAISE NOTICE '3. ✅ Exécuter les migrations dans l''ordre';
    RAISE NOTICE '4. 🔄 Ré-exécuter cet audit pour vérifier';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ATTENTION:';
    RAISE NOTICE '   - Toujours tester les migrations sur un environnement de développement';
    RAISE NOTICE '   - Faire une sauvegarde avant d''exécuter sur production';
    RAISE NOTICE '   - Vérifier que les données existantes ont un company_id valide';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Script d''audit terminé';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;


-- ============================================================================
-- SCRIPT DE MIGRATION GÉNÉRIQUE (TEMPLATE)
-- ============================================================================
-- 
-- Ce template peut être copié et adapté pour chaque table nécessitant
-- l'isolation multi-tenant.
--
-- Remplacer {TABLE_NAME} par le nom de votre table.
-- ============================================================================

/*

-- ============================================================================
-- MIGRATION: Ajout multi-tenant pour {TABLE_NAME}
-- ============================================================================

-- 1. Ajouter la colonne company_id si elle n'existe pas
ALTER TABLE public.{TABLE_NAME} 
  ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Ajouter la contrainte NOT NULL (après avoir rempli les valeurs)
-- ATTENTION: Assurez-vous que toutes les lignes ont un company_id avant!
-- ALTER TABLE public.{TABLE_NAME} 
--   ALTER COLUMN company_id SET NOT NULL;

-- 3. Ajouter la Foreign Key vers companies
ALTER TABLE public.{TABLE_NAME} 
  ADD CONSTRAINT IF NOT EXISTS fk_{TABLE_NAME}_company_id
  FOREIGN KEY (company_id) 
  REFERENCES public.companies(id) 
  ON DELETE CASCADE;

-- 4. Créer un index sur company_id pour les performances
CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_company_id 
  ON public.{TABLE_NAME} (company_id);

-- 5. Activer RLS
ALTER TABLE public.{TABLE_NAME} ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.{TABLE_NAME} FORCE ROW LEVEL SECURITY;

-- 6. Supprimer les anciennes policies (si elles existent)
DROP POLICY IF EXISTS "select_own_company_{TABLE_NAME}" ON public.{TABLE_NAME};
DROP POLICY IF EXISTS "insert_own_company_{TABLE_NAME}" ON public.{TABLE_NAME};
DROP POLICY IF EXISTS "update_own_company_{TABLE_NAME}" ON public.{TABLE_NAME};
DROP POLICY IF EXISTS "delete_own_company_{TABLE_NAME}" ON public.{TABLE_NAME};

-- 7. Créer les 4 policies standards
CREATE POLICY "select_own_company_{TABLE_NAME}" ON public.{TABLE_NAME}
  FOR SELECT
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "insert_own_company_{TABLE_NAME}" ON public.{TABLE_NAME}
  FOR INSERT
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "update_own_company_{TABLE_NAME}" ON public.{TABLE_NAME}
  FOR UPDATE
  USING (company_id = (auth.jwt()->>'company_id')::uuid)
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "delete_own_company_{TABLE_NAME}" ON public.{TABLE_NAME}
  FOR DELETE
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ============================================================================
-- FIN DE LA MIGRATION POUR {TABLE_NAME}
-- ============================================================================

*/


-- ============================================================================
-- FONCTIONS UTILITAIRES POUR VÉRIFIER L'ISOLATION
-- ============================================================================

-- Fonction pour vérifier si une table a l'isolation multi-tenant correcte
CREATE OR REPLACE FUNCTION public.check_table_isolation(table_name_param TEXT)
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'company_id column'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = table_name_param
              AND column_name = 'company_id'
        ) THEN '✅ OK' ELSE '❌ MISSING' END,
        'Column company_id existence'::TEXT
    
    UNION ALL
    
    SELECT 
        'Foreign Key'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
              AND tc.table_name = table_name_param
              AND tc.constraint_type = 'FOREIGN KEY'
              AND ccu.column_name = 'company_id'
        ) THEN '✅ OK' ELSE '❌ MISSING' END,
        'Foreign key to companies table'::TEXT
    
    UNION ALL
    
    SELECT 
        'RLS Enabled'::TEXT,
        CASE WHEN (
            SELECT relrowsecurity
            FROM pg_class
            WHERE oid = ('public.' || table_name_param)::regclass
        ) THEN '✅ OK' ELSE '❌ DISABLED' END,
        'Row Level Security status'::TEXT
    
    UNION ALL
    
    SELECT 
        'RLS Policies'::TEXT,
        CASE WHEN (
            SELECT COUNT(*) FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = table_name_param
        ) >= 4 THEN '✅ OK' ELSE '⚠️  INCOMPLETE' END,
        (SELECT COUNT(*)::TEXT || ' policies found' FROM pg_policies
         WHERE schemaname = 'public' AND tablename = table_name_param);
END;
$$;

-- Exemple d'utilisation:
-- SELECT * FROM public.check_table_isolation('clients');


-- ============================================================================
-- FONCTION POUR BACKFILLER company_id SUR LES DONNÉES EXISTANTES
-- ============================================================================

-- Cette fonction attribue automatiquement un company_id aux enregistrements
-- qui n'en ont pas, en se basant sur le user_id
CREATE OR REPLACE FUNCTION public.backfill_company_id_from_user(
    table_name_param TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    rows_updated INTEGER := 0;
    sql_query TEXT;
BEGIN
    -- Vérifier que la table a les colonnes nécessaires
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = table_name_param
          AND column_name IN ('company_id', 'user_id')
    ) THEN
        RAISE EXCEPTION 'Table % must have both company_id and user_id columns', table_name_param;
    END IF;

    -- Construire et exécuter la requête UPDATE
    sql_query := format('
        UPDATE public.%I t
        SET company_id = cu.company_id
        FROM public.company_users cu
        WHERE t.user_id = cu.user_id
          AND t.company_id IS NULL
          AND cu.status = ''active''
    ', table_name_param);

    EXECUTE sql_query;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    RAISE NOTICE 'Backfilled % rows in table %', rows_updated, table_name_param;
    RETURN rows_updated;
END;
$$;

-- Exemple d'utilisation:
-- SELECT public.backfill_company_id_from_user('clients');


-- ============================================================================
-- FIN DU SCRIPT D'AUDIT ET MIGRATION MULTI-TENANT
-- ============================================================================
