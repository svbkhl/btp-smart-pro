-- =====================================================
-- MIGRATION : Isolation de user_settings par entreprise
-- =====================================================
-- user_settings contient des informations d'entreprise (SIRET, TVA, logo, etc.)
-- qui doivent être isolées par entreprise, pas par utilisateur.
-- 
-- CHANGEMENTS :
-- 1. Ajouter company_id à user_settings
-- 2. Supprimer contrainte UNIQUE(user_id)
-- 3. Ajouter contrainte UNIQUE(company_id) - un seul settings par entreprise
-- 4. Migrer données existantes vers leur entreprise
-- 5. Ajouter trigger force_company_id
-- 6. Créer RLS policies strictes
-- =====================================================

DO $$
DECLARE
  v_has_column BOOLEAN;
  v_has_null BOOLEAN;
  v_migrated_count INTEGER;
  v_deleted_count INTEGER;
  v_constraint_name TEXT;
BEGIN
  -- Vérifier si la table existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings'
  ) THEN
    RAISE NOTICE 'ℹ️ Table user_settings n''existe pas - ignorée';
    RETURN;
  END IF;

  RAISE NOTICE '🔄 Début migration user_settings...';

  -- 1. Ajouter company_id si manquant
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'company_id'
  ) INTO v_has_column;

  IF NOT v_has_column THEN
    ALTER TABLE public.user_settings 
    ADD COLUMN company_id UUID;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne company_id existe déjà';
  END IF;

  -- 2. Migrer les données existantes vers leur entreprise
  UPDATE public.user_settings us
  SET company_id = (
    SELECT cu.company_id
    FROM public.company_users cu
    WHERE cu.user_id = us.user_id
    ORDER BY CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_users' 
        AND column_name = 'status'
      ) AND cu.status = 'active' THEN 0
      ELSE 1
    END
    LIMIT 1
  )
  WHERE us.company_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = us.user_id
  );

  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
  IF v_migrated_count > 0 THEN
    RAISE NOTICE '✅ % ligne(s) migrée(s)', v_migrated_count;
  END IF;

  -- 3. Supprimer les settings sans entreprise
  DELETE FROM public.user_settings WHERE company_id IS NULL;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '⚠️ % ligne(s) sans entreprise supprimée(s)', v_deleted_count;
  END IF;

  -- 4. Vérifier s'il reste des NULL
  SELECT EXISTS (SELECT 1 FROM public.user_settings WHERE company_id IS NULL) INTO v_has_null;
  
  IF NOT v_has_null THEN
    -- 5. Ajouter foreign key et index
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'user_settings' 
      AND constraint_name = 'user_settings_company_id_fkey'
    ) THEN
      ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_company_id_fkey 
      FOREIGN KEY (company_id) 
      REFERENCES public.companies(id) 
      ON DELETE CASCADE;
      
      RAISE NOTICE '✅ Foreign key ajoutée';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'user_settings' 
      AND indexname = 'idx_user_settings_company_id'
    ) THEN
      CREATE INDEX idx_user_settings_company_id ON public.user_settings(company_id);
      RAISE NOTICE '✅ Index créé';
    END IF;

    -- 6. Passer company_id en NOT NULL
    ALTER TABLE public.user_settings ALTER COLUMN company_id SET NOT NULL;
    RAISE NOTICE '✅ company_id est maintenant NOT NULL';
  ELSE
    RAISE WARNING '⚠️ Il reste des NULL - ne peut pas passer en NOT NULL';
  END IF;

  -- 7. Supprimer l'ancienne contrainte UNIQUE(user_id) si elle existe
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
  AND table_name = 'user_settings'
  AND constraint_type = 'UNIQUE'
  AND constraint_name LIKE '%user_id%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    RAISE NOTICE '✅ Ancienne contrainte UNIQUE(user_id) supprimée';
  END IF;

  -- 7.5 Gérer les doublons de company_id avant d'ajouter la contrainte UNIQUE
  -- Pour chaque company_id dupliqué, garder un seul enregistrement (le plus récent)
  -- et supprimer les autres
  DELETE FROM public.user_settings
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) as rn
      FROM public.user_settings
      WHERE company_id IS NOT NULL
    ) duplicates
    WHERE duplicates.rn > 1
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '⚠️ % doublon(s) de company_id supprimé(s)', v_deleted_count;
  END IF;

  -- 8. Ajouter nouvelle contrainte UNIQUE(company_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'user_settings' 
    AND constraint_name = 'user_settings_company_id_key'
  ) THEN
    -- Vérifier qu'il n'y a plus de doublons
    IF EXISTS (
      SELECT company_id 
      FROM public.user_settings 
      WHERE company_id IS NOT NULL
      GROUP BY company_id 
      HAVING COUNT(*) > 1
    ) THEN
      RAISE EXCEPTION 'Il reste des doublons de company_id. Impossible d''ajouter la contrainte UNIQUE.';
    END IF;

    ALTER TABLE public.user_settings
    ADD CONSTRAINT user_settings_company_id_key UNIQUE (company_id);
    
    RAISE NOTICE '✅ Contrainte UNIQUE(company_id) ajoutée';
  END IF;

  -- 9. Supprimer l'ancien trigger
  DROP TRIGGER IF EXISTS force_company_id_user_settings_trigger ON public.user_settings;

  -- 10. Créer le trigger BEFORE INSERT
  CREATE TRIGGER force_company_id_user_settings_trigger
  BEFORE INSERT ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.force_company_id();

  RAISE NOTICE '✅ Trigger créé';

  -- 11. Activer RLS
  ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

  -- 12. Supprimer toutes les anciennes policies
  DROP POLICY IF EXISTS "Users can view their own user_settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can create their own user_settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can update their own user_settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can delete their own user_settings" ON public.user_settings;
  DROP POLICY IF EXISTS user_settings_select_policy ON public.user_settings;
  DROP POLICY IF EXISTS user_settings_insert_policy ON public.user_settings;
  DROP POLICY IF EXISTS user_settings_update_policy ON public.user_settings;
  DROP POLICY IF EXISTS user_settings_delete_policy ON public.user_settings;

  -- 13. Créer les policies RLS strictes
  CREATE POLICY "user_settings_select_company_isolation"
  ON public.user_settings FOR SELECT
  USING (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
    )
  );

  CREATE POLICY "user_settings_insert_company_isolation"
  ON public.user_settings FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
    )
  );

  CREATE POLICY "user_settings_update_company_isolation"
  ON public.user_settings FOR UPDATE
  USING (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
    )
  )
  WITH CHECK (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
    )
  );

  CREATE POLICY "user_settings_delete_company_isolation"
  ON public.user_settings FOR DELETE
  USING (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
    )
  );

  RAISE NOTICE '✅ Policies RLS créées';
  RAISE NOTICE '✅ Migration user_settings terminée avec succès!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erreur lors de la migration user_settings: %', SQLERRM;
    RAISE;
END $$;
