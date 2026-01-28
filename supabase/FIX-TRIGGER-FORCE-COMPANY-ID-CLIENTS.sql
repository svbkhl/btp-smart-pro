-- =====================================================
-- CORRECTION URGENTE : Trigger force_company_id pour clients
-- =====================================================
-- Ce script s'assure que le trigger force_company_id
-- est actif sur la table clients
-- =====================================================

-- 1. Vérifier si la colonne company_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'company_id'
  ) THEN
    -- Ajouter la colonne company_id
    ALTER TABLE public.clients 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à la table clients';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne company_id existe déjà';
  END IF;
END $$;

-- 2. Créer la fonction force_company_id si elle n'existe pas
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

-- 3. Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS force_company_id_clients_trigger ON public.clients;
DROP TRIGGER IF EXISTS force_company_id_clients ON public.clients;

-- 4. Créer le trigger BEFORE INSERT pour forcer company_id
CREATE TRIGGER force_company_id_clients_trigger
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.force_company_id();

-- 5. Vérifier que le trigger est créé
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'clients'
    AND trigger_name = 'force_company_id_clients_trigger'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger force_company_id_clients_trigger créé avec succès';
  ELSE
    RAISE WARNING '⚠️ Le trigger n''a pas été créé correctement';
  END IF;
END $$;

-- 6. Vérifier que les clients existants ont un company_id
-- (Migrer les clients existants sans company_id)
DO $$
DECLARE
  v_client_record RECORD;
  v_company_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_client_record IN
    SELECT id, user_id
    FROM public.clients
    WHERE company_id IS NULL
  LOOP
    -- Essayer de trouver un company_id pour cet utilisateur
    SELECT company_id INTO v_company_id
    FROM public.company_users
    WHERE user_id = v_client_record.user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_company_id IS NOT NULL THEN
      UPDATE public.clients
      SET company_id = v_company_id
      WHERE id = v_client_record.id;
      v_updated_count := v_updated_count + 1;
    ELSE
      RAISE WARNING '⚠️ Impossible de trouver un company_id pour le client % (user_id: %)', v_client_record.id, v_client_record.user_id;
    END IF;
  END LOOP;
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ % client(s) mis à jour avec un company_id', v_updated_count;
  ELSE
    RAISE NOTICE 'ℹ️ Aucun client sans company_id trouvé';
  END IF;
END $$;

-- 7. Supprimer les clients qui n'ont toujours pas de company_id (sécurité)
DELETE FROM public.clients
WHERE company_id IS NULL;

-- 8. Ajouter la contrainte NOT NULL si tous les clients ont un company_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'company_id'
    AND is_nullable = 'NO'
  ) THEN
    -- Vérifier qu'il n'y a plus de clients sans company_id
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE company_id IS NULL) THEN
      ALTER TABLE public.clients 
      ALTER COLUMN company_id SET NOT NULL;
      
      RAISE NOTICE '✅ Contrainte NOT NULL ajoutée à company_id';
    ELSE
      RAISE WARNING '⚠️ Impossible d''ajouter NOT NULL : il reste des clients sans company_id';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ La colonne company_id est déjà NOT NULL';
  END IF;
END $$;

-- 9. Afficher un résumé
SELECT 
  'Résumé' as info,
  COUNT(*) as total_clients,
  COUNT(DISTINCT company_id) as nombre_entreprises,
  COUNT(*) FILTER (WHERE company_id IS NULL) as clients_sans_company_id
FROM public.clients;
