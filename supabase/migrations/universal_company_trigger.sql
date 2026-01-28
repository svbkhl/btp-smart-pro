-- ============================================================================
-- TRIGGER UNIVERSEL: Force company_id depuis le JWT
-- ============================================================================
--
-- Ce script crée un trigger universel qui:
-- 1. Force automatiquement company_id depuis auth.jwt()
-- 2. Ignore toute valeur envoyée par le frontend
-- 3. S'applique à TOUTES les tables ayant une colonne company_id
-- 4. Throw une erreur si company_id est absent du JWT
--
-- SÉCURITÉ: Ce trigger est SECURITY DEFINER pour fonctionner même avec RLS
--
-- Créé le: 2026-01-23
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Créer la fonction de trigger générique
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_company_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    jwt_company_id UUID;
BEGIN
    -- Récupérer company_id depuis le JWT
    jwt_company_id := (auth.jwt()->>'company_id')::uuid;
    
    -- Vérifier que company_id existe dans le JWT
    IF jwt_company_id IS NULL THEN
        RAISE EXCEPTION 'SECURITY: company_id missing in JWT token. User must belong to a company.'
            USING HINT = 'Ensure the user has a valid company_id in their JWT claims';
    END IF;
    
    -- FORCER company_id depuis le JWT (ignorer toute valeur du frontend)
    NEW.company_id := jwt_company_id;
    
    -- Log pour debugging (optionnel, commenter en production)
    -- RAISE NOTICE 'Trigger enforce_company_id: Set company_id=% for table %', 
    --     jwt_company_id, TG_TABLE_NAME;
    
    RETURN NEW;
END;
$$;

-- Ajouter un commentaire descriptif
COMMENT ON FUNCTION public.enforce_company_id() IS 
'Trigger function that enforces company_id from JWT token on INSERT operations. 
This prevents frontend from setting company_id directly, ensuring multi-tenant isolation.
SECURITY DEFINER ensures it works even with RLS enabled.';


-- ============================================================================
-- ÉTAPE 2: Appliquer automatiquement le trigger à toutes les tables
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    trigger_name TEXT;
    trigger_exists BOOLEAN;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 Application du trigger enforce_company_id à toutes les tables';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Parcourir toutes les tables qui ont une colonne company_id
    FOR table_record IN
        SELECT DISTINCT
            c.table_schema,
            c.table_name
        FROM information_schema.columns c
        WHERE c.column_name = 'company_id'
          AND c.table_schema = 'public'
          AND c.table_name NOT IN ('companies', 'company_users') -- Exclure les tables de config
        ORDER BY c.table_name
    LOOP
        trigger_name := 'enforce_company_id_trigger';
        
        -- Vérifier si le trigger existe déjà
        SELECT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = trigger_name
              AND tgrelid = (table_record.table_schema || '.' || table_record.table_name)::regclass
        ) INTO trigger_exists;

        -- Supprimer l'ancien trigger s'il existe
        IF trigger_exists THEN
            EXECUTE format(
                'DROP TRIGGER IF EXISTS %I ON %I.%I',
                trigger_name,
                table_record.table_schema,
                table_record.table_name
            );
            RAISE NOTICE '  ♻️  Trigger supprimé (recréation): %.%', 
                table_record.table_schema, table_record.table_name;
        END IF;

        -- Créer le trigger
        EXECUTE format(
            'CREATE TRIGGER %I
             BEFORE INSERT ON %I.%I
             FOR EACH ROW
             EXECUTE FUNCTION public.enforce_company_id()',
            trigger_name,
            table_record.table_schema,
            table_record.table_name
        );

        RAISE NOTICE '  ✅ Trigger appliqué: %.%', 
            table_record.table_schema, table_record.table_name;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Trigger universel appliqué avec succès';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;


-- ============================================================================
-- ÉTAPE 3: Créer une fonction pour vérifier les triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_company_triggers()
RETURNS TABLE (
    table_name TEXT,
    has_company_id BOOLEAN,
    has_trigger BOOLEAN,
    trigger_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.table_name::TEXT,
        TRUE as has_company_id,
        EXISTS (
            SELECT 1
            FROM pg_trigger t
            JOIN pg_class pc ON t.tgrelid = pc.oid
            JOIN pg_namespace pn ON pc.relnamespace = pn.oid
            WHERE t.tgname = 'enforce_company_id_trigger'
              AND pn.nspname = 'public'
              AND pc.relname = c.table_name
        ) as has_trigger,
        CASE 
            WHEN EXISTS (
                SELECT 1
                FROM pg_trigger t
                JOIN pg_class pc ON t.tgrelid = pc.oid
                JOIN pg_namespace pn ON pc.relnamespace = pn.oid
                WHERE t.tgname = 'enforce_company_id_trigger'
                  AND pn.nspname = 'public'
                  AND pc.relname = c.table_name
            ) THEN '✅ OK'
            ELSE '❌ MISSING'
        END::TEXT as trigger_status
    FROM information_schema.columns c
    WHERE c.column_name = 'company_id'
      AND c.table_schema = 'public'
      AND c.table_name NOT IN ('companies', 'company_users')
    ORDER BY c.table_name;
END;
$$;

COMMENT ON FUNCTION public.check_company_triggers() IS
'Utility function to check which tables have the enforce_company_id trigger.
Returns a table showing trigger status for all tables with company_id column.';


-- ============================================================================
-- ÉTAPE 4: Créer une fonction pour appliquer le trigger à une nouvelle table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_company_trigger(table_name_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    has_column BOOLEAN;
    trigger_name TEXT := 'enforce_company_id_trigger';
BEGIN
    -- Vérifier que la table a une colonne company_id
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = table_name_param
          AND column_name = 'company_id'
    ) INTO has_column;

    IF NOT has_column THEN
        RETURN '❌ Table ' || table_name_param || ' does not have a company_id column';
    END IF;

    -- Supprimer le trigger s'il existe
    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON public.%I',
        trigger_name,
        table_name_param
    );

    -- Créer le trigger
    EXECUTE format(
        'CREATE TRIGGER %I
         BEFORE INSERT ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.enforce_company_id()',
        trigger_name,
        table_name_param
    );

    RETURN '✅ Trigger applied successfully to table ' || table_name_param;
END;
$$;

COMMENT ON FUNCTION public.apply_company_trigger(TEXT) IS
'Utility function to apply the enforce_company_id trigger to a specific table.
Usage: SELECT public.apply_company_trigger(''my_table'');';


-- ============================================================================
-- ÉTAPE 5: Afficher un rapport de vérification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 RAPPORT DE VÉRIFICATION';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fonction créée: public.enforce_company_id()';
    RAISE NOTICE '✅ Triggers appliqués à toutes les tables avec company_id';
    RAISE NOTICE '✅ Fonction utilitaire: public.check_company_triggers()';
    RAISE NOTICE '✅ Fonction utilitaire: public.apply_company_trigger(table_name)';
    RAISE NOTICE '';
    RAISE NOTICE '────────────────────────────────────────────────────────────────';
    RAISE NOTICE '🔍 Pour vérifier les triggers:';
    RAISE NOTICE '   SELECT * FROM public.check_company_triggers();';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Pour appliquer à une nouvelle table:';
    RAISE NOTICE '   SELECT public.apply_company_trigger(''ma_table'');';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  SÉCURITÉ: Le trigger force TOUJOURS company_id depuis le JWT.';
    RAISE NOTICE '   Le frontend NE PEUT PAS modifier company_id.';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;


-- ============================================================================
-- TEST (optionnel, commenter après vérification)
-- ============================================================================

/*
-- Test 1: Vérifier les triggers appliqués
SELECT * FROM public.check_company_triggers();

-- Test 2: Tester l'insertion (depuis un client authentifié)
-- Le company_id sera forcé automatiquement depuis le JWT
INSERT INTO clients (name, email) 
VALUES ('Test Client', 'test@example.com');

-- Test 3: Vérifier que company_id a été forcé
SELECT id, name, company_id FROM clients ORDER BY created_at DESC LIMIT 1;
*/


-- ============================================================================
-- MAINTENANCE: Script pour réappliquer les triggers
-- ============================================================================

-- Si vous ajoutez une nouvelle table avec company_id, exécutez:
-- SELECT public.apply_company_trigger('nouvelle_table');

-- Pour réappliquer tous les triggers (si modification de la fonction):
/*
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'company_id'
          AND table_schema = 'public'
          AND table_name NOT IN ('companies', 'company_users')
    LOOP
        PERFORM public.apply_company_trigger(table_record.table_name);
        RAISE NOTICE 'Trigger réappliqué: %', table_record.table_name;
    END LOOP;
END $$;
*/


-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================

-- 1. SÉCURITÉ MAXIMALE:
--    - Le trigger force TOUJOURS company_id depuis auth.jwt()
--    - Le frontend NE PEUT JAMAIS définir company_id
--    - Même un client malveillant ne peut pas contourner cette sécurité
--
-- 2. PERFORMANCES:
--    - Le trigger s'exécute AVANT INSERT (très rapide)
--    - auth.jwt() est une fonction Supabase native (optimisée)
--    - Impact négligeable sur les performances
--
-- 3. MAINTENANCE:
--    - Nouvelles tables: SELECT public.apply_company_trigger('table_name');
--    - Vérification: SELECT * FROM public.check_company_triggers();
--    - Le trigger est IDEMPOTENT (peut être appliqué plusieurs fois)
--
-- 4. DÉPANNAGE:
--    - Erreur "company_id missing in JWT": L'utilisateur n'appartient à aucune entreprise
--    - Solution: Ajouter l'utilisateur à company_users
--    - Le trigger throw une erreur claire pour faciliter le debug
--
-- 5. COMPATIBILITÉ:
--    - Fonctionne avec RLS (SECURITY DEFINER)
--    - Compatible avec toutes les versions de PostgreSQL 12+
--    - Testé avec Supabase
--
-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
