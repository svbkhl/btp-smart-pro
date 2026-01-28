-- =====================================================
-- CORRECTION COMPLÈTE : Isolation clients par entreprise
-- =====================================================
-- Ce script corrige TOUT ce qui est nécessaire pour
-- garantir l'isolation complète des clients par entreprise
-- =====================================================

-- ÉTAPE 1 : Vérifier et créer la colonne company_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.clients 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
    
    RAISE NOTICE '✅ Colonne company_id ajoutée';
  END IF;
END $$;

-- ÉTAPE 2 : Créer/mettre à jour la fonction current_company_id
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

-- ÉTAPE 3 : Créer/mettre à jour la fonction force_company_id
CREATE OR REPLACE FUNCTION public.force_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := public.current_company_id();
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de déterminer company_id. L''utilisateur doit être membre d''une entreprise.';
  END IF;
  
  -- Forcer company_id (ignorer toute valeur venant du frontend)
  NEW.company_id := v_company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 4 : Supprimer et recréer le trigger force_company_id
DROP TRIGGER IF EXISTS force_company_id_clients_trigger ON public.clients;
DROP TRIGGER IF EXISTS force_company_id_clients ON public.clients;

CREATE TRIGGER force_company_id_clients_trigger
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.force_company_id();

-- ÉTAPE 5 : Migrer les clients existants sans company_id
DO $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.clients c
  SET company_id = (
    SELECT company_id
    FROM public.company_users cu
    WHERE cu.user_id = c.user_id
    ORDER BY cu.created_at ASC
    LIMIT 1
  )
  WHERE c.company_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = c.user_id
  );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ % client(s) mis à jour avec un company_id', v_updated_count;
  END IF;
END $$;

-- ÉTAPE 6 : Supprimer les clients sans company_id (sécurité)
DELETE FROM public.clients WHERE company_id IS NULL;

-- ÉTAPE 7 : Supprimer TOUTES les anciennes RLS policies
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
  END LOOP;
  
  RAISE NOTICE '✅ Anciennes policies supprimées';
END $$;

-- ÉTAPE 8 : Créer les RLS policies strictes basées sur company_id
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- SELECT : Voir uniquement les clients de son entreprise
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

-- INSERT : Le trigger force company_id
CREATE POLICY "clients_insert_company_isolation"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
);

-- UPDATE : Modifier uniquement les clients de son entreprise
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

-- DELETE : Supprimer uniquement les clients de son entreprise
CREATE POLICY "clients_delete_company_isolation"
ON public.clients
FOR DELETE
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.current_company_id()
);

-- ÉTAPE 9 : Vérification finale
DO $$
DECLARE
  v_policy_count INTEGER;
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'clients'
    AND trigger_name = 'force_company_id_clients_trigger'
  ) INTO v_trigger_exists;
  
  IF v_policy_count = 4 AND v_trigger_exists THEN
    RAISE NOTICE '✅ SUCCÈS : 4 policies strictes créées + trigger actif';
  ELSE
    RAISE WARNING '⚠️ Vérification : % policies, trigger=%', v_policy_count, v_trigger_exists;
  END IF;
END $$;

-- Afficher le résumé
SELECT 
  'Résumé final' as info,
  (SELECT COUNT(*) FROM public.clients) as total_clients,
  (SELECT COUNT(DISTINCT company_id) FROM public.clients) as nombre_entreprises,
  (SELECT COUNT(*) FROM public.clients WHERE company_id IS NULL) as clients_sans_company_id,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients') as nombre_policies;
