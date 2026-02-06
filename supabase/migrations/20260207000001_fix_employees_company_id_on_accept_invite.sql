-- =====================================================
-- Fix: null value in column "company_id" of "employees"
-- when accepting an invitation (insert into company_users).
-- =====================================================
-- Un trigger (ou une fonction) insère dans employees sans company_id.
-- On supprime les triggers sur company_users qui pourraient en être
-- la cause, puis on ajoute un trigger propre qui sync employees avec company_id.
-- =====================================================

-- 1. Supprimer tout trigger sur company_users SAUF le trigger "first user owner"
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'company_users'
      AND NOT t.tgisinternal
      AND t.tgname != 'trigger_ensure_first_company_user_is_owner'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.company_users', r.tgname);
    RAISE NOTICE 'Dropped trigger % on company_users', r.tgname;
  END LOOP;
END $$;

-- 2. Créer une fonction qui synchronise employees après ajout à company_users
--    (insère ou met à jour une ligne employees avec company_id)
CREATE OR REPLACE FUNCTION public.sync_employee_on_company_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_nom TEXT;
  v_prenom TEXT;
  v_has_company_id BOOLEAN;
  v_has_employees BOOLEAN;
BEGIN
  -- Vérifier que la table employees existe et a la colonne company_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employees'
  ) INTO v_has_employees;
  IF NOT v_has_employees THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'company_id'
  ) INTO v_has_company_id;
  IF NOT v_has_company_id THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(u.email, ''),
    COALESCE(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'last_name', ''),
    COALESCE(u.raw_user_meta_data->>'prenom', u.raw_user_meta_data->>'first_name', '')
  INTO v_email, v_nom, v_prenom
  FROM auth.users u
  WHERE u.id = NEW.user_id
  LIMIT 1;

  v_email := COALESCE(NULLIF(TRIM(v_email), ''), 'membre@company.local');
  v_nom   := COALESCE(NULLIF(TRIM(v_nom), ''), 'Membre');
  v_prenom := COALESCE(NULLIF(TRIM(v_prenom), ''), ' ');

  -- Insert ou update employees (company_id obligatoire pour éviter NOT NULL violation)
  BEGIN
    INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
    VALUES (NEW.company_id, NEW.user_id, v_nom, v_prenom, v_email, 'Membre')
    ON CONFLICT (user_id) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      nom = COALESCE(NULLIF(TRIM(nom), ''), EXCLUDED.nom),
      prenom = COALESCE(NULLIF(TRIM(prenom), ''), EXCLUDED.prenom),
      email = EXCLUDED.email,
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      -- Table sans unique(user_id) ou autre schéma : insert si pas de ligne pour (user_id, company_id)
      INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
      SELECT NEW.company_id, NEW.user_id, v_nom, v_prenom, v_email, 'Membre'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = NEW.user_id AND e.company_id = NEW.company_id
      );
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas faire échouer l'insert company_users si employees échoue (ex: colonnes manquantes)
    RAISE WARNING 'sync_employee_on_company_user_insert: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_employee_on_company_user_insert() IS
  'Après INSERT sur company_users, assure une ligne employees avec company_id pour ce user/company.';

-- 3. Créer le trigger AFTER INSERT sur company_users
DROP TRIGGER IF EXISTS trigger_sync_employee_on_company_user ON public.company_users;
CREATE TRIGGER trigger_sync_employee_on_company_user
  AFTER INSERT ON public.company_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_employee_on_company_user_insert();
