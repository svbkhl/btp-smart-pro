-- =====================================================
-- CORRECTION FINALE URGENTE : Isolation clients
-- =====================================================
-- Ce script corrige DÉFINITIVEMENT le problème
-- =====================================================

-- ÉTAPE 1 : Vérifier/créer colonne company_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
  END IF;
END $$;

-- ÉTAPE 2 : S'assurer que current_company_id() existe et fonctionne
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_users'
    AND column_name = 'status'
  ) THEN
    SELECT company_id INTO v_company_id
    FROM public.company_users 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    SELECT company_id INTO v_company_id
    FROM public.company_users 
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN v_company_id;
END;
$$;

-- ÉTAPE 3 : Créer/mettre à jour force_company_id
CREATE OR REPLACE FUNCTION public.force_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := public.current_company_id();
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de déterminer company_id. L''utilisateur doit être membre d''une entreprise.';
  END IF;
  
  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 4 : Supprimer tous les triggers existants
DROP TRIGGER IF EXISTS force_company_id_clients_trigger ON public.clients;
DROP TRIGGER IF EXISTS force_company_id_clients ON public.clients;

-- ÉTAPE 5 : Créer le trigger BEFORE INSERT
CREATE TRIGGER force_company_id_clients_trigger
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.force_company_id();

-- ÉTAPE 6 : Migrer tous les clients existants sans company_id
UPDATE public.clients c
SET company_id = (
  SELECT company_id
  FROM public.company_users cu
  WHERE cu.user_id = c.user_id
  ORDER BY cu.created_at ASC
  LIMIT 1
)
WHERE c.company_id IS NULL
AND EXISTS (SELECT 1 FROM public.company_users cu WHERE cu.user_id = c.user_id);

-- ÉTAPE 7 : Supprimer les clients sans company_id (sécurité)
DELETE FROM public.clients WHERE company_id IS NULL;

-- ÉTAPE 8 : Supprimer TOUTES les policies existantes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', r.policyname);
  END LOOP;
END $$;

-- ÉTAPE 9 : Activer RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 10 : Créer UNE SEULE policy SELECT STRICTE
CREATE POLICY "clients_select_company_isolation"
ON public.clients FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL 
  AND company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = clients.company_id
    AND (
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_users' 
        AND column_name = 'status'
      )
      OR cu.status = 'active'
    )
  )
);

-- ÉTAPE 11 : Créer policy INSERT (le trigger force company_id)
CREATE POLICY "clients_insert_company_isolation"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (company_id = public.current_company_id());

-- ÉTAPE 12 : Créer policy UPDATE
CREATE POLICY "clients_update_company_isolation"
ON public.clients FOR UPDATE
TO authenticated
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

-- ÉTAPE 13 : Créer policy DELETE
CREATE POLICY "clients_delete_company_isolation"
ON public.clients FOR DELETE
TO authenticated
USING (company_id = public.current_company_id());

-- ÉTAPE 14 : Vérification finale
DO $$
DECLARE
  v_policies INTEGER;
  v_trigger_exists BOOLEAN;
  v_clients_null INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policies FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients';
  SELECT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_schema = 'public' AND event_object_table = 'clients' AND trigger_name = 'force_company_id_clients_trigger') INTO v_trigger_exists;
  SELECT COUNT(*) INTO v_clients_null FROM public.clients WHERE company_id IS NULL;
  
  IF v_policies = 4 AND v_trigger_exists AND v_clients_null = 0 THEN
    RAISE NOTICE '✅ SUCCÈS COMPLET : 4 policies + trigger + 0 clients NULL';
  ELSE
    RAISE WARNING '⚠️ Vérification : % policies, trigger=%, clients NULL=%', v_policies, v_trigger_exists, v_clients_null;
  END IF;
END $$;
