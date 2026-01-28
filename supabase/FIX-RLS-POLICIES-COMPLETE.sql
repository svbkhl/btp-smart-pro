-- =====================================================
-- CORRECTION COMPLÈTE : RLS Policies pour clients
-- =====================================================
-- Ce script supprime TOUTES les anciennes policies
-- et crée des policies strictes basées sur company_id
-- =====================================================

-- ÉTAPE 1 : Supprimer TOUTES les policies existantes
DO $$
DECLARE
  v_policy_record RECORD;
BEGIN
  FOR v_policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'clients'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', v_policy_record.policyname);
    RAISE NOTICE '✅ Policy supprimée: %', v_policy_record.policyname;
  END LOOP;
END $$;

-- ÉTAPE 2 : S'assurer que RLS est activé
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 3 : Créer la policy SELECT STRICTE
CREATE POLICY "clients_select_company_isolation"
ON public.clients
FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
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
);

-- ÉTAPE 4 : Créer la policy INSERT STRICTE
CREATE POLICY "clients_insert_company_isolation"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
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
);

-- ÉTAPE 5 : Créer la policy UPDATE STRICTE
CREATE POLICY "clients_update_company_isolation"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
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
)
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
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
);

-- ÉTAPE 6 : Créer la policy DELETE STRICTE
CREATE POLICY "clients_delete_company_isolation"
ON public.clients
FOR DELETE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
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
);

-- ÉTAPE 7 : Vérification finale
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_policy_count = 4 THEN
    RAISE NOTICE '✅ SUCCÈS : 4 policies strictes créées (SELECT, INSERT, UPDATE, DELETE)';
  ELSE
    RAISE WARNING '⚠️ ATTENTION : % policies trouvées au lieu de 4', v_policy_count;
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
