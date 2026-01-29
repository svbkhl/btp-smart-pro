-- ============================================================================
-- Premier compte d'une entreprise = toujours dirigeant (owner)
-- ============================================================================
-- Trigger : à chaque INSERT sur company_users, si c'est le premier membre
-- de cette entreprise, on force le rôle à owner pour éviter les problèmes
-- d'accès (employés, intégrations, etc.).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_first_company_user_is_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count INT;
  v_owner_role_id UUID;
BEGIN
  -- Compter les membres déjà présents pour cette entreprise (avant cet INSERT)
  SELECT COUNT(*) INTO v_existing_count
  FROM public.company_users
  WHERE company_id = NEW.company_id;

  -- Si aucun membre encore : ce nouvel utilisateur est le premier → on le met en owner
  IF v_existing_count = 0 THEN
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = NEW.company_id AND slug = 'owner'
    LIMIT 1;

    IF v_owner_role_id IS NOT NULL THEN
      NEW.role_id := v_owner_role_id;
      -- Colonne role (text) si elle existe
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'company_users' AND column_name = 'role'
      ) THEN
        NEW.role := 'owner';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_first_company_user_is_owner() IS
  'Force le rôle owner pour le premier utilisateur ajouté à une entreprise (company_users).';

-- Supprimer le trigger s'il existait déjà (idempotent)
DROP TRIGGER IF EXISTS trigger_ensure_first_company_user_is_owner ON public.company_users;

-- Créer le trigger BEFORE INSERT
CREATE TRIGGER trigger_ensure_first_company_user_is_owner
  BEFORE INSERT ON public.company_users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_first_company_user_is_owner();

-- ============================================================================
-- Correction rétroactive : entreprises qui n'ont qu'un seul membre sans rôle owner
-- On met à jour ce membre en owner si le rôle owner existe pour cette entreprise
-- ============================================================================

DO $$
DECLARE
  v_updated INT := 0;
  v_owner_role_id UUID;
  v_cu RECORD;
BEGIN
  FOR v_cu IN
    SELECT cu.company_id, cu.user_id, cu.role_id, r.slug AS current_slug
    FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.company_id IN (
      SELECT company_id FROM public.company_users
      GROUP BY company_id
      HAVING COUNT(*) = 1
    )
    AND (r.slug IS NULL OR r.slug != 'owner')
  LOOP
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE company_id = v_cu.company_id AND slug = 'owner'
    LIMIT 1;

    IF v_owner_role_id IS NOT NULL THEN
      UPDATE public.company_users
      SET role_id = v_owner_role_id
      WHERE company_id = v_cu.company_id AND user_id = v_cu.user_id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  IF v_updated > 0 THEN
    RAISE NOTICE '✅ % premier(s) compte(s) d''entreprise mis à jour en owner', v_updated;
  END IF;
END $$;
