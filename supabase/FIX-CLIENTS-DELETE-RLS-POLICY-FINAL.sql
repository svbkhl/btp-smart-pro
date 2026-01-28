-- =====================================================
-- CORRECTION FINALE : Policy DELETE pour clients
-- =====================================================
-- Ce script supprime TOUTES les policies DELETE existantes
-- et crée une seule policy stricte pour garantir l'isolation
-- =====================================================

-- 1. SUPPRIMER TOUTES les policies DELETE existantes (méthode exhaustive)
DO $$
DECLARE
  v_policy_record RECORD;
BEGIN
  -- Supprimer toutes les policies DELETE de la table clients
  FOR v_policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'clients'
    AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', v_policy_record.policyname);
    RAISE NOTICE '✅ Policy DELETE supprimée: %', v_policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Toutes les anciennes policies DELETE ont été supprimées';
END $$;

-- 2. Supprimer aussi manuellement les policies connues (au cas où)
DROP POLICY IF EXISTS "clients_delete_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "_delete_company_isolation" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients of their company" ON public.clients;
DROP POLICY IF EXISTS "Company members can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.clients;

-- 3. Vérifier qu'il n'y a plus de policies DELETE
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND cmd = 'DELETE';
  
  IF v_policy_count > 0 THEN
    RAISE WARNING '⚠️ Il reste % policy(ies) DELETE - vérification requise', v_policy_count;
  ELSE
    RAISE NOTICE '✅ Aucune policy DELETE restante';
  END IF;
END $$;

-- 4. Créer UNE SEULE policy DELETE STRICTE
CREATE POLICY "clients_delete_company_isolation"
ON public.clients
FOR DELETE
USING (
  -- Condition 1 : Le client doit avoir un company_id
  company_id IS NOT NULL
  -- Condition 2 : Le company_id du client doit correspondre au company_id de l'utilisateur
  AND company_id = public.current_company_id()
  -- Condition 3 : L'utilisateur doit être membre de cette entreprise
  AND EXISTS (
    SELECT 1 
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = clients.company_id
    -- Si la colonne status existe, vérifier qu'elle est 'active'
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
  AND tablename = 'clients'
  AND cmd = 'DELETE';
  
  IF v_final_policy_count = 1 THEN
    RAISE NOTICE '✅ Policy DELETE stricte créée avec succès';
    RAISE NOTICE '✅ Il y a exactement 1 policy DELETE active (comme souhaité)';
  ELSE
    RAISE WARNING '⚠️ ATTENTION : Il y a % policy(ies) DELETE active(s)', v_final_policy_count;
  END IF;
END $$;

-- 7. Afficher le contenu de la policy créée pour vérification
SELECT 
  policyname,
  cmd,
  qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
AND cmd = 'DELETE';
