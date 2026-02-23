-- ============================================================================
-- Fix: company_id NULL - propriétaires d'entreprise (Henry, futurs)
-- ============================================================================
-- 1. Corriger company_users : rows avec company_id NULL quand user est owner
-- 2. Mettre à jour le trigger sync_employee pour fallback companies.owner_id
-- ============================================================================

-- 1. Corriger company_users : propriétaires sans company_id
DO $$
DECLARE
  v_fixed INTEGER := 0;
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'owner_id') THEN
    FOR r IN
      SELECT cu.id, cu.user_id, c.id AS company_id
      FROM company_users cu
      JOIN companies c ON c.owner_id = cu.user_id
      WHERE cu.company_id IS NULL
    LOOP
      UPDATE company_users SET company_id = r.company_id, role = 'owner' WHERE id = r.id;
      v_fixed := v_fixed + 1;
    END LOOP;
    IF v_fixed > 0 THEN
      RAISE NOTICE 'company_users: % ligne(s) corrigée(s) (company_id depuis companies.owner_id)', v_fixed;
    END IF;
    -- Créer company_users manquants pour les propriétaires
    INSERT INTO company_users (company_id, user_id, role)
    SELECT c.id, c.owner_id, 'owner'
    FROM companies c
    WHERE c.owner_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM company_users cu WHERE cu.company_id = c.id AND cu.user_id = c.owner_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Fix company_users: %', SQLERRM;
END $$;

-- 2. Mettre à jour le trigger sync_employee : fallback companies.owner_id quand NEW.company_id est NULL
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
  v_company_id UUID;
  v_has_company_id BOOLEAN;
  v_has_employees BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') INTO v_has_employees;
  IF NOT v_has_employees THEN RETURN NEW; END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'company_id') INTO v_has_company_id;
  IF NOT v_has_company_id THEN RETURN NEW; END IF;

  SELECT COALESCE(u.email, ''), COALESCE(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'last_name', ''), COALESCE(u.raw_user_meta_data->>'prenom', u.raw_user_meta_data->>'first_name', '')
  INTO v_email, v_nom, v_prenom
  FROM auth.users u WHERE u.id = NEW.user_id LIMIT 1;

  v_email := COALESCE(NULLIF(TRIM(v_email), ''), 'membre@company.local');
  v_nom   := COALESCE(NULLIF(TRIM(v_nom), ''), 'Employé');
  v_prenom := COALESCE(NULLIF(TRIM(v_prenom), ''), ' ');

  v_company_id := NEW.company_id;
  IF v_company_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'owner_id') THEN
    SELECT id INTO v_company_id FROM public.companies WHERE owner_id = NEW.user_id LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
    VALUES (v_company_id, NEW.user_id, v_nom, v_prenom, v_email, 'Employé')
    ON CONFLICT (user_id) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      nom = COALESCE(NULLIF(TRIM(nom), ''), EXCLUDED.nom),
      prenom = COALESCE(NULLIF(TRIM(prenom), ''), EXCLUDED.prenom),
      email = EXCLUDED.email,
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
      SELECT v_company_id, NEW.user_id, v_nom, v_prenom, v_email, 'Employé'
      WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = NEW.user_id AND e.company_id = v_company_id);
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_employee_on_company_user_insert: %', SQLERRM;
    RETURN NEW;
END;
$$;
