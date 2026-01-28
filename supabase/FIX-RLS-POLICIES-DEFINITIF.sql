-- =====================================================
-- CORRECTION DÉFINITIVE : RLS Policies SELECT
-- =====================================================
-- PROBLÈME IDENTIFIÉ : Les RLS policies permettent de voir
-- des clients d'autres entreprises
-- SOLUTION : Supprimer TOUTES les policies et recréer
-- une policy SELECT STRICTE
-- =====================================================

-- ÉTAPE 1 : Supprimer TOUTES les policies existantes
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', r.policyname);
    RAISE NOTICE '✅ Policy supprimée: %', r.policyname;
  END LOOP;
END $$;

-- ÉTAPE 2 : S'assurer que RLS est activé
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 3 : Créer UNE SEULE policy SELECT TRÈS STRICTE
-- Cette policy vérifie TOUT pour garantir l'isolation
CREATE POLICY "clients_select_company_isolation"
ON public.clients
FOR SELECT
TO authenticated
USING (
  -- Condition 1 : company_id ne doit PAS être NULL
  company_id IS NOT NULL
  -- Condition 2 : company_id doit correspondre EXACTEMENT au current_company_id()
  AND company_id = public.current_company_id()
  -- Condition 3 : L'utilisateur DOIT être membre de cette entreprise
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
);

-- ÉTAPE 4 : Créer policy INSERT (le trigger force company_id)
CREATE POLICY "clients_insert_company_isolation"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
);

-- ÉTAPE 5 : Créer policy UPDATE
CREATE POLICY "clients_update_company_isolation"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
)
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
);

-- ÉTAPE 6 : Créer policy DELETE
CREATE POLICY "clients_delete_company_isolation"
ON public.clients
FOR DELETE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
);

-- ÉTAPE 7 : Vérification finale
DO $$
DECLARE
  v_select_policy TEXT;
  v_policy_count INTEGER;
BEGIN
  -- Vérifier que la policy SELECT existe et est correcte
  SELECT qual INTO v_select_policy
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'SELECT'
  LIMIT 1;
  
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_policy_count = 4 AND v_select_policy IS NOT NULL THEN
    RAISE NOTICE '✅ SUCCÈS : 4 policies créées';
    RAISE NOTICE '✅ Policy SELECT : %', v_select_policy;
  ELSE
    RAISE WARNING '⚠️ Vérification : % policies, SELECT policy=%', v_policy_count, v_select_policy IS NOT NULL;
  END IF;
END $$;

-- Afficher toutes les policies créées
SELECT 
  'Policies créées' as info,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
ORDER BY cmd;
