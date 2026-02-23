-- ============================================================================
-- Appliquer en une fois : chaque employé de chaque entreprise voit le planning
-- ============================================================================
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================================

-- 0a. Mettre à jour le trigger : fallback companies.owner_id si company_id NULL
CREATE OR REPLACE FUNCTION public.sync_employee_on_company_user_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT; v_nom TEXT; v_prenom TEXT; v_company_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='employees') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='company_id') THEN RETURN NEW; END IF;
  v_company_id := NEW.company_id;
  IF v_company_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='owner_id') THEN
    SELECT id INTO v_company_id FROM public.companies WHERE owner_id = NEW.user_id LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(u.email,''), COALESCE(u.raw_user_meta_data->>'nom',u.raw_user_meta_data->>'last_name',''), COALESCE(u.raw_user_meta_data->>'prenom',u.raw_user_meta_data->>'first_name','') INTO v_email, v_nom, v_prenom FROM auth.users u WHERE u.id=NEW.user_id LIMIT 1;
  v_email := COALESCE(NULLIF(TRIM(v_email),''),'membre@company.local'); v_nom := COALESCE(NULLIF(TRIM(v_nom),''),'Employé'); v_prenom := COALESCE(NULLIF(TRIM(v_prenom),''),' ');
  BEGIN
    INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste) VALUES (v_company_id, NEW.user_id, v_nom, v_prenom, v_email, 'Employé')
    ON CONFLICT (user_id) DO UPDATE SET company_id=EXCLUDED.company_id, nom=COALESCE(NULLIF(TRIM(nom),''),EXCLUDED.nom), prenom=COALESCE(NULLIF(TRIM(prenom),''),EXCLUDED.prenom), email=EXCLUDED.email, updated_at=now();
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste) SELECT v_company_id, NEW.user_id, v_nom, v_prenom, v_email, 'Employé'
    WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id=NEW.user_id AND e.company_id=v_company_id);
  END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'sync_employee: %', SQLERRM; RETURN NEW;
END;
$$;

-- 0a2. Migrer poste 'Membre' → 'Employé' dans employees
UPDATE public.employees SET poste = 'Employé', updated_at = now() WHERE poste = 'Membre';

-- 0b. Corriger company_users : propriétaires sans company_id (Henry et futurs)
--    Utilise companies.owner_id pour remplir company_id manquant
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
      RAISE NOTICE '✅ % entrée(s) company_users corrigée(s) (propriétaires)', v_fixed;
    END IF;
  END IF;
  -- Propriétaires sans entrée company_users : en créer une
  INSERT INTO company_users (company_id, user_id, role)
  SELECT c.id, c.owner_id, 'owner'
  FROM companies c
  WHERE c.owner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM company_users cu WHERE cu.company_id = c.id AND cu.user_id = c.owner_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Étape 0: %', SQLERRM;
END $$;

-- 0c. Remplir company_id manquant sur employee_assignments (depuis employees)
UPDATE public.employee_assignments ea
SET company_id = e.company_id, updated_at = now()
FROM public.employees e
WHERE ea.employee_id = e.id
  AND ea.company_id IS NULL
  AND e.company_id IS NOT NULL;

-- 1. RLS : les employés voient toujours leurs affectations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_assignments') THEN
    DROP POLICY IF EXISTS "Employees can always view own assignments fallback" ON public.employee_assignments;
    CREATE POLICY "Employees can always view own assignments fallback"
      ON public.employee_assignments FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = employee_assignments.employee_id
          AND e.user_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ RLS : employés peuvent voir leurs affectations';
  END IF;
END $$;

-- 2. Sync : créer une fiche employees pour chaque membre qui n'en a pas
DO $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
  v_company_id UUID;
BEGIN
  FOR r IN
    WITH membres AS (
      SELECT DISTINCT ON (cu.user_id)
        cu.user_id,
        COALESCE(
          cu.company_id,
          (SELECT c2.company_id FROM company_users c2 WHERE c2.user_id = cu.user_id AND c2.company_id IS NOT NULL LIMIT 1),
          (SELECT id FROM companies WHERE owner_id = cu.user_id LIMIT 1),
          (SELECT id FROM companies LIMIT 1)
        ) AS company_id,
        COALESCE(u.email, 'membre@company.local') AS email,
        COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'nom'), ''), u.raw_user_meta_data->>'last_name', 'Employé') AS nom,
        COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'prenom'), ''), u.raw_user_meta_data->>'first_name', ' ') AS prenom
      FROM company_users cu
      JOIN auth.users u ON u.id = cu.user_id
      ORDER BY cu.user_id, (CASE WHEN cu.company_id IS NOT NULL THEN 0 ELSE 1 END), cu.company_id
    )
    SELECT m.* FROM membres m
    WHERE m.company_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = m.user_id AND e.company_id = m.company_id)
  LOOP
    v_company_id := r.company_id;
    IF v_company_id IS NULL THEN CONTINUE; END IF;
    BEGIN
      INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
      VALUES (v_company_id, r.user_id, r.nom, r.prenom, r.email, 'Employé');
      v_count := v_count + 1;
    EXCEPTION 
      WHEN unique_violation THEN
        UPDATE public.employees SET company_id = COALESCE(company_id, v_company_id), nom = COALESCE(NULLIF(TRIM(nom), ''), r.nom), prenom = COALESCE(NULLIF(TRIM(prenom), ''), r.prenom), email = COALESCE(NULLIF(TRIM(email), ''), r.email) WHERE user_id = r.user_id;
        v_count := v_count + 1;
      WHEN OTHERS THEN
        RAISE NOTICE 'Skip user % : %', r.user_id, SQLERRM;
    END;
  END LOOP;

  -- Propriétaires d'entreprise sans fiche employees
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'owner_id') THEN
    FOR r IN
      SELECT 
        c.owner_id AS user_id,
        c.id AS company_id,
        COALESCE(u.email, 'membre@company.local') AS email,
        COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'nom'), ''), u.raw_user_meta_data->>'last_name', 'Propriétaire') AS nom,
        COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'prenom'), ''), u.raw_user_meta_data->>'first_name', ' ') AS prenom
      FROM companies c
      JOIN auth.users u ON u.id = c.owner_id
      WHERE c.owner_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = c.owner_id AND e.company_id = c.id)
    LOOP
      IF r.company_id IS NULL THEN
        RAISE NOTICE 'Skip propriétaire user % : company_id null', r.user_id;
        CONTINUE;
      END IF;
      BEGIN
        INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
        VALUES (r.company_id, r.user_id, r.nom, r.prenom, r.email, 'Propriétaire');
        v_count := v_count + 1;
      EXCEPTION 
        WHEN unique_violation THEN
          UPDATE public.employees SET company_id = COALESCE(company_id, r.company_id), nom = CASE WHEN nom IS NULL OR nom = '' THEN r.nom ELSE nom END, prenom = CASE WHEN prenom IS NULL OR prenom = '' THEN r.prenom ELSE prenom END, email = COALESCE(NULLIF(TRIM(email), ''), r.email) WHERE user_id = r.user_id;
          v_count := v_count + 1;
        WHEN OTHERS THEN
          RAISE NOTICE 'Skip propriétaire user % : %', r.user_id, SQLERRM;
      END;
    END LOOP;
  END IF;

  RAISE NOTICE '✅ % membre(s) synchronisé(s) vers employees', v_count;
END $$;
