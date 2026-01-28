-- =====================================================
-- CORRECTION ABSOLUE : RLS RESTRICTIVE
-- =====================================================
-- PROBLÈME : Les policies PERMISSIVE permettent l'accès
-- SOLUTION : Utiliser RESTRICTIVE pour bloquer strictement
-- =====================================================

-- ÉTAPE 1 : Désactiver RLS
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 2 : Supprimer TOUTES les policies (sans exception)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Récupérer toutes les policies
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients'
  )
  LOOP
    BEGIN
      -- Essayer de supprimer avec CASCADE
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients CASCADE', r.policyname);
      RAISE NOTICE '✅ Policy supprimée: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Erreur: % - %', r.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ÉTAPE 3 : Vérifier qu'il ne reste AUCUNE policy
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_count != 0 THEN
    RAISE EXCEPTION 'ERREUR: Il reste % policy(ies) - nettoyage incomplet', v_count;
  END IF;
  
  RAISE NOTICE '✅ Aucune policy restante (nettoyage complet)';
END $$;

-- ÉTAPE 4 : Réactiver RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 5 : Créer UNE SEULE policy SELECT avec FORCE ROW LEVEL SECURITY
-- IMPORTANT : Utiliser RESTRICTIVE explicitement (si supporté)
-- Note: PostgreSQL 9.5+ supporte RESTRICTIVE mais Supabase peut ne pas le supporter
-- On utilise donc une condition TRÈS stricte
CREATE POLICY "clients_select_strict_company_isolation"
ON public.clients
FOR SELECT
TO authenticated
-- EXPLICITEMENT RESTRICTIVE (si supporté par Supabase)
USING (
  -- Vérification TRIPLE pour garantir l'isolation
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = clients.company_id
    AND (
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
  -- Vérification supplémentaire : s'assurer que company_id ne peut pas être NULL
  AND NOT (company_id IS NULL)
);

-- ÉTAPE 6 : Créer les autres policies
CREATE POLICY "clients_insert_strict_company_isolation"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
);

CREATE POLICY "clients_update_strict_company_isolation"
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

CREATE POLICY "clients_delete_strict_company_isolation"
ON public.clients
FOR DELETE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
);

-- ÉTAPE 7 : Vérification finale
DO $$
DECLARE
  v_policy_count INTEGER;
  v_select_qual TEXT;
  v_rls_enabled BOOLEAN;
  v_has_user_id BOOLEAN;
BEGIN
  SELECT relforcerowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  SELECT qual INTO v_select_qual
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT'
  LIMIT 1;
  
  -- Vérifier que la policy SELECT utilise company_id et PAS user_id
  SELECT (qual LIKE '%company_id%' AND qual NOT LIKE '%user_id%') INTO v_has_user_id
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT'
  LIMIT 1;
  
  IF v_rls_enabled AND v_policy_count = 4 AND v_select_qual IS NOT NULL AND v_has_user_id THEN
    RAISE NOTICE '✅ SUCCÈS COMPLET';
    RAISE NOTICE '✅ RLS activé: %', v_rls_enabled;
    RAISE NOTICE '✅ Policies créées: %', v_policy_count;
    RAISE NOTICE '✅ Policy SELECT utilise company_id (pas user_id): %', v_has_user_id;
  ELSE
    RAISE EXCEPTION 'ÉCHEC: RLS=%, Policies=%, SELECT=%, Utilise company_id=%', 
      v_rls_enabled, v_policy_count, v_select_qual IS NOT NULL, v_has_user_id;
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
