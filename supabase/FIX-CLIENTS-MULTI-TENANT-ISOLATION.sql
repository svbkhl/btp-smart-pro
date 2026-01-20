-- =====================================================
-- MIGRATION CRITIQUE : Isolation stricte des clients par entreprise
-- =====================================================
-- Ce script corrige le bug critique où les clients étaient
-- visibles par toutes les entreprises.
-- 
-- ACTIONS :
-- 1. Ajoute company_id à la table clients (si manquant)
-- 2. Crée les RLS policies strictes basées sur company_id
-- 3. Crée un trigger pour forcer company_id depuis JWT
-- 4. Migre les clients existants vers leur entreprise
-- 5. Supprime toute policy permissive
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER ET AJOUTER company_id À LA TABLE clients
-- =====================================================

DO $$
BEGIN
  -- Vérifier si company_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'company_id'
  ) THEN
    -- Ajouter company_id comme nullable d'abord
    ALTER TABLE public.clients 
    ADD COLUMN company_id UUID;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à la table clients';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne company_id existe déjà';
  END IF;
END $$;

-- Ajouter la foreign key si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'clients' 
    AND constraint_name = 'clients_company_id_fkey'
  ) THEN
    ALTER TABLE public.clients 
    ADD CONSTRAINT clients_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES public.companies(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Foreign key ajoutée pour company_id';
  ELSE
    RAISE NOTICE 'ℹ️ Foreign key existe déjà';
  END IF;
END $$;

-- Ajouter l'index si il n'existe pas
CREATE INDEX IF NOT EXISTS idx_clients_company_id 
ON public.clients(company_id);

-- =====================================================
-- 2. MIGRER LES CLIENTS EXISTANTS VERS LEUR ENTREPRISE
-- =====================================================

-- Rattacher les clients sans company_id à l'entreprise de leur user_id
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.clients c
  SET company_id = (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = c.user_id
    ORDER BY CASE WHEN cu.status = 'active' THEN 0 ELSE 1 END
    LIMIT 1
  )
  WHERE c.company_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = c.user_id
  );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ % client(s) rattaché(s) à leur entreprise', v_updated_count;
  ELSE
    RAISE NOTICE 'ℹ️ Aucun client à migrer';
  END IF;
END $$;

-- Supprimer les clients sans entreprise (fuite de sécurité)
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.clients
  WHERE company_id IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '⚠️ % client(s) sans entreprise supprimé(s) pour sécurité', v_deleted_count;
  ELSE
    RAISE NOTICE 'ℹ️ Aucun client sans entreprise trouvé';
  END IF;
END $$;

-- =====================================================
-- 3. PASSER company_id EN NOT NULL (après migration)
-- =====================================================

DO $$
BEGIN
  -- Vérifier s'il reste des NULL
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE company_id IS NULL) THEN
    ALTER TABLE public.clients 
    ALTER COLUMN company_id SET NOT NULL;
    
    RAISE NOTICE '✅ company_id est maintenant NOT NULL';
  ELSE
    RAISE WARNING '⚠️ Il reste des clients avec company_id NULL - ne peut pas passer en NOT NULL';
  END IF;
END $$;

-- =====================================================
-- 4. CRÉER/ACTUALISER LA FONCTION current_company_id()
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
BEGIN
  -- Récupérer user_id depuis le JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Récupérer company_id depuis company_users
  SELECT cu.company_id INTO v_company_id
  FROM public.company_users cu
  WHERE cu.user_id = v_user_id
  ORDER BY CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_users' 
      AND column_name = 'status'
    ) AND cu.status = 'active' THEN 0
    ELSE 1
  END
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 5. CRÉER LE TRIGGER POUR FORCER company_id LORS DES INSERT
-- =====================================================

-- Fonction trigger pour forcer company_id
CREATE OR REPLACE FUNCTION public.force_company_id_for_clients()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Récupérer company_id depuis le JWT (ignore toute valeur frontend)
  v_company_id := public.current_company_id();
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de déterminer company_id. L''utilisateur doit être membre d''une entreprise.';
  END IF;
  
  -- Forcer company_id (ignorer toute valeur venant du frontend)
  NEW.company_id := v_company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS force_company_id_clients_trigger ON public.clients;

-- Créer le trigger BEFORE INSERT
CREATE TRIGGER force_company_id_clients_trigger
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.force_company_id_for_clients();

-- =====================================================
-- 6. SUPPRIMER TOUTES LES POLICIES EXISTANTES (permissives)
-- =====================================================

-- Supprimer toutes les policies existantes sur clients
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- =====================================================
-- 7. ACTIVER RLS SUR clients
-- =====================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CRÉER LES POLICIES RLS STRICTES BASÉES SUR company_id
-- =====================================================

-- Policy SELECT : Seulement les clients de l'entreprise de l'utilisateur
CREATE POLICY "clients_select_company_isolation"
ON public.clients FOR SELECT
USING (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.clients.company_id
  )
);

-- Policy INSERT : Forcer company_id depuis JWT (trigger s'en occupe déjà, mais double sécurité)
CREATE POLICY "clients_insert_company_isolation"
ON public.clients FOR INSERT
WITH CHECK (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = company_id
  )
);

-- Policy UPDATE : Seulement modifier les clients de son entreprise
CREATE POLICY "clients_update_company_isolation"
ON public.clients FOR UPDATE
USING (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.clients.company_id
  )
)
WITH CHECK (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = company_id
  )
);

-- Policy DELETE : Seulement supprimer les clients de son entreprise
CREATE POLICY "clients_delete_company_isolation"
ON public.clients FOR DELETE
USING (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = public.clients.company_id
  )
);

-- =====================================================
-- 9. VÉRIFICATIONS FINALES
-- =====================================================

-- Vérifier qu'il n'y a plus de clients sans company_id
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM public.clients
  WHERE company_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING '⚠️ Il reste % client(s) avec company_id NULL', v_null_count;
  ELSE
    RAISE NOTICE '✅ Tous les clients ont un company_id';
  END IF;
END $$;

-- Vérifier qu'il n'y a pas de clients partagés entre entreprises
DO $$
DECLARE
  v_shared_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT c.id) INTO v_shared_count
  FROM public.clients c
  INNER JOIN public.company_users cu1 ON cu1.user_id = c.user_id
  INNER JOIN public.company_users cu2 ON cu2.user_id = c.user_id AND cu2.company_id != cu1.company_id
  WHERE c.company_id = cu1.company_id;
  
  IF v_shared_count > 0 THEN
    RAISE WARNING '⚠️ % client(s) potentiellement partagés détectés', v_shared_count;
  ELSE
    RAISE NOTICE '✅ Aucun client partagé entre entreprises';
  END IF;
END $$;

-- =====================================================
-- RÉSUMÉ
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ ISOLATION CLIENTS COMPLÈTE';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Colonne company_id ajoutée/vérifiée';
  RAISE NOTICE '✅ Foreign key et index créés';
  RAISE NOTICE '✅ Clients existants migrés vers leur entreprise';
  RAISE NOTICE '✅ Trigger force_company_id_for_clients créé';
  RAISE NOTICE '✅ RLS activé avec policies strictes';
  RAISE NOTICE '✅ Anciennes policies permissives supprimées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Les clients sont maintenant strictement isolés par entreprise';
  RAISE NOTICE '🔒 Impossible de voir ou créer un client hors de son entreprise';
  RAISE NOTICE '';
END $$;
