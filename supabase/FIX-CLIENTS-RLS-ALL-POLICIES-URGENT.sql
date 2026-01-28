-- =====================================================
-- CORRECTION URGENTE : Toutes les RLS Policies pour clients
-- =====================================================
-- Ce script supprime TOUTES les anciennes policies
-- qui utilisent user_id au lieu de company_id
-- et crée des policies strictes basées sur company_id
-- =====================================================

-- 1. SUPPRIMER TOUTES les anciennes policies (SELECT, INSERT, UPDATE, DELETE)
DO $$
DECLARE
  v_policy_record RECORD;
BEGIN
  -- Supprimer toutes les policies de la table clients
  FOR v_policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'clients'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', v_policy_record.policyname);
    RAISE NOTICE '✅ Policy supprimée: %', v_policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Toutes les anciennes policies ont été supprimées';
END $$;

-- 2. Supprimer aussi manuellement les policies connues (au cas où)
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "clients_select_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "clients_update_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "_select_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "_insert_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "_update_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "_delete_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients of their company" ON public.clients;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.clients;

-- 3. Vérifier qu'il n'y a plus de policies
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_policy_count > 0 THEN
    RAISE WARNING '⚠️ Il reste % policy(ies) - vérification requise', v_policy_count;
  ELSE
    RAISE NOTICE '✅ Aucune policy restante';
  END IF;
END $$;

-- 4. Créer les policies STRICTES basées sur company_id

-- 4.1 Policy SELECT : Voir uniquement les clients de son entreprise
CREATE POLICY "clients_select_company_isolation"
ON public.clients
FOR SELECT
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

-- 4.2 Policy INSERT : Créer uniquement pour son entreprise
-- Note: Le trigger force_company_id s'assure que company_id est correct
CREATE POLICY "clients_insert_company_isolation"
ON public.clients
FOR INSERT
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

-- 4.3 Policy UPDATE : Modifier uniquement les clients de son entreprise
CREATE POLICY "clients_update_company_isolation"
ON public.clients
FOR UPDATE
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

-- 4.4 Policy DELETE : Supprimer uniquement les clients de son entreprise
CREATE POLICY "clients_delete_company_isolation"
ON public.clients
FOR DELETE
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

-- 5. Vérifier que RLS est activé
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 6. Afficher un message de confirmation final
DO $$
DECLARE
  v_final_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_final_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_final_policy_count = 4 THEN
    RAISE NOTICE '✅ Toutes les policies strictes ont été créées avec succès (4 policies)';
  ELSE
    RAISE WARNING '⚠️ ATTENTION : Il y a % policy(ies) au lieu de 4', v_final_policy_count;
  END IF;
END $$;

-- 7. Afficher le contenu de toutes les policies créées
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
ORDER BY cmd;
