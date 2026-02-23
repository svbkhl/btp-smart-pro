-- ============================================================================
-- Projets (chantiers) : restent visibles même si l'owner créateur est supprimé
-- ============================================================================
-- Quand un owner crée un chantier, il apparaît pour tous les owners de l'entreprise.
-- Si cet owner est supprimé, le chantier doit rester (user_id mis à NULL).
-- ============================================================================

-- 1. Supprimer la contrainte FK actuelle (ON DELETE CASCADE)
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'projects'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constraint);
    RAISE NOTICE 'Contrainte FK % supprimée', v_constraint;
  END IF;
END $$;

-- 2. Rendre user_id nullable (créateur du chantier, peut être NULL si supprimé)
ALTER TABLE public.projects ALTER COLUMN user_id DROP NOT NULL;

-- 3. Recréer la FK avec ON DELETE SET NULL
ALTER TABLE public.projects
  ADD CONSTRAINT projects_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.user_id IS 'Créateur du chantier (NULL si compte supprimé). Les chantiers restent visibles à tous les owners via company_id.';
