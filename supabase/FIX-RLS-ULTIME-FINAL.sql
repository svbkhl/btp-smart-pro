-- =====================================================
-- CORRECTION ULTIME : RLS Policies pour clients
-- =====================================================
-- PROBLÈME : RLS retourne des clients d'autres entreprises
-- SOLUTION : Policy SELECT qui vérifie STRICTEMENT que
-- l'utilisateur est membre UNIQUEMENT de l'entreprise
-- du client (pas de toutes les entreprises)
-- =====================================================

-- ÉTAPE 1 : Désactiver RLS
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 2 : Supprimer TOUTES les policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients CASCADE', r.policyname);
  END LOOP;
END $$;

-- ÉTAPE 3 : Vérifier qu'il ne reste AUCUNE policy
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients';
  IF v_count != 0 THEN
    RAISE EXCEPTION 'ERREUR: Il reste % policy(ies)', v_count;
  END IF;
END $$;

-- ÉTAPE 4 : Réactiver RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 5 : Créer UNE SEULE policy SELECT ULTRA-STRICTE
-- Cette policy vérifie que:
-- 1. Le client a un company_id
-- 2. Le company_id correspond EXACTEMENT au current_company_id()
-- 3. L'utilisateur est membre de CETTE entreprise spécifique
-- 4. current_company_id() ne retourne pas NULL
CREATE POLICY "clients_select_ultra_strict"
ON public.clients
FOR SELECT
TO authenticated
USING (
  -- Vérification 1 : company_id ne doit PAS être NULL
  company_id IS NOT NULL
  -- Vérification 2 : current_company_id() ne doit PAS retourner NULL
  AND public.current_company_id() IS NOT NULL
  -- Vérification 3 : company_id doit correspondre EXACTEMENT au current_company_id()
  AND company_id = public.current_company_id()
  -- Vérification 4 : L'utilisateur DOIT être membre de CETTE entreprise spécifique
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
  -- Vérification 5 : Double vérification que company_id n'est pas NULL
  AND NOT (company_id IS NULL)
);

-- ÉTAPE 6 : Créer les autres policies
CREATE POLICY "clients_insert_ultra_strict"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
  AND public.current_company_id() IS NOT NULL
);

CREATE POLICY "clients_update_ultra_strict"
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

CREATE POLICY "clients_delete_ultra_strict"
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
  v_select_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
BEGIN
  SELECT relforcerowsecurity INTO v_rls_enabled
  FROM pg_class WHERE relname = 'clients' AND relnamespace = 'public'::regnamespace;
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND cmd = 'SELECT'
    AND qual LIKE '%company_id = public.current_company_id()%'
  ) INTO v_select_exists;
  
  IF v_rls_enabled AND v_policy_count = 4 AND v_select_exists THEN
    RAISE NOTICE '✅ SUCCÈS : RLS activé, 4 policies créées, SELECT utilise company_id';
  ELSE
    RAISE EXCEPTION 'ÉCHEC: RLS=%, Policies=%, SELECT utilise company_id=%', 
      v_rls_enabled, v_policy_count, v_select_exists;
  END IF;
END $$;

-- Afficher les policies créées
SELECT 
  'Policies créées' as info,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
ORDER BY cmd;
