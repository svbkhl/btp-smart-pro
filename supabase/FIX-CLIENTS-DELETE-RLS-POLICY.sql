-- =====================================================
-- CORRECTION : Policy DELETE pour clients
-- =====================================================
-- Le problème est que la policy DELETE actuelle peut permettre
-- la suppression de clients d'autres entreprises dans certains cas.
-- On va créer une policy DELETE plus stricte.
-- =====================================================

-- 1. Supprimer toutes les anciennes policies DELETE
-- Supprimer la policy créée par FIX-ALL-TABLES-MULTI-TENANT-ISOLATION.sql
DROP POLICY IF EXISTS "clients_delete_company_isolation" ON public.clients;
-- Supprimer d'autres noms possibles
DROP POLICY IF EXISTS "_delete_company_isolation" ON public.clients;
-- Supprimer les anciennes policies avec des noms génériques
DO $$
DECLARE
  v_policy_name TEXT;
BEGIN
  -- Supprimer toutes les policies DELETE qui contiennent "delete" dans leur nom
  FOR v_policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'clients'
    AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', v_policy_name);
    RAISE NOTICE 'Policy DELETE supprimée: %', v_policy_name;
  END LOOP;
END $$;

-- 2. Créer une policy DELETE STRICTE qui vérifie que :
--    - Le client appartient à la même entreprise que l'utilisateur
--    - L'utilisateur est membre de cette entreprise
CREATE POLICY "clients_delete_company_isolation"
ON public.clients
FOR DELETE
USING (
  -- Le client doit avoir un company_id
  company_id IS NOT NULL
  -- Le company_id du client doit correspondre au company_id de l'utilisateur
  AND company_id = public.current_company_id()
  -- Vérifier que l'utilisateur est bien membre de cette entreprise
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

-- 3. Vérifier que RLS est activé
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Policy DELETE stricte créée pour la table clients';
  RAISE NOTICE '⚠️ Cette policy empêche la suppression de clients d''autres entreprises';
END $$;
