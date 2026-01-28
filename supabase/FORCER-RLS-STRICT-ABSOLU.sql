-- =====================================================
-- CORRECTION ABSOLUE : RLS Policies STRICTES
-- =====================================================
-- Ce script force des RLS policies ABSOLUMENT strictes
-- en supprimant TOUT et recréant avec une logique très stricte
-- =====================================================

-- ÉTAPE 1 : DÉSACTIVER temporairement RLS pour pouvoir tout nettoyer
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 2 : Supprimer TOUTES les policies existantes (y compris celles avec des noms étranges)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients'
  )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', r.policyname);
      RAISE NOTICE '✅ Policy supprimée: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Erreur en supprimant %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ÉTAPE 3 : Supprimer aussi manuellement les policies connues (au cas où)
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "clients_select_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "clients_insert_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "clients_update_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "clients_delete_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "_select_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "_insert_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "_update_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "_delete_company_isolation" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view clients of their company" ON public.clients';
  EXECUTE 'DROP POLICY IF EXISTS "Allow select for authenticated" ON public.clients';
END $$;

-- ÉTAPE 4 : Vérifier qu'il ne reste AUCUNE policy
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_count > 0 THEN
    RAISE WARNING '⚠️ Il reste encore % policy(ies) - vérification manuelle requise', v_count;
  ELSE
    RAISE NOTICE '✅ Aucune policy restante';
  END IF;
END $$;

-- ÉTAPE 5 : REACTIVER RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 6 : Créer UNE SEULE policy SELECT STRICTE
-- Cette policy est RESTRICTIVE (pas permissive) et vérifie TOUT
CREATE POLICY "clients_select_company_isolation"
ON public.clients
FOR SELECT
TO authenticated
USING (
  -- Vérification 1 : company_id ne doit PAS être NULL
  company_id IS NOT NULL
  -- Vérification 2 : company_id doit correspondre EXACTEMENT au current_company_id()
  AND company_id = public.current_company_id()
  -- Vérification 3 : L'utilisateur DOIT être membre de cette entreprise
  AND EXISTS (
    SELECT 1 
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = clients.company_id
    AND (
      -- Si la colonne status existe, vérifier qu'elle est 'active'
      NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_users' 
        AND column_name = 'status'
      )
      OR cu.status = 'active'
    )
  )
  -- Vérification 4 : current_company_id() ne doit PAS retourner NULL
  AND public.current_company_id() IS NOT NULL
);

-- ÉTAPE 7 : Créer policy INSERT
CREATE POLICY "clients_insert_company_isolation"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
);

-- ÉTAPE 8 : Créer policy UPDATE
CREATE POLICY "clients_update_company_isolation"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
)
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
);

-- ÉTAPE 9 : Créer policy DELETE
CREATE POLICY "clients_delete_company_isolation"
ON public.clients
FOR DELETE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
);

-- ÉTAPE 10 : Vérification finale STRICTE
DO $$
DECLARE
  v_select_policy TEXT;
  v_policy_count INTEGER;
  v_rls_enabled BOOLEAN;
BEGIN
  -- Vérifier RLS
  SELECT relforcerowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;
  
  -- Vérifier la policy SELECT
  SELECT qual INTO v_select_policy
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT'
  LIMIT 1;
  
  -- Compter les policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_rls_enabled AND v_policy_count = 4 AND v_select_policy IS NOT NULL THEN
    RAISE NOTICE '✅ SUCCÈS COMPLET';
    RAISE NOTICE '✅ RLS activé: %', v_rls_enabled;
    RAISE NOTICE '✅ Nombre de policies: %', v_policy_count;
    RAISE NOTICE '✅ Policy SELECT créée';
  ELSE
    RAISE WARNING '⚠️ PROBLÈME: RLS=%, Policies=%, SELECT=%', v_rls_enabled, v_policy_count, v_select_policy IS NOT NULL;
  END IF;
END $$;

-- Afficher toutes les policies créées
SELECT 
  'Policies finales' as info,
  policyname,
  cmd,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
ORDER BY cmd;
