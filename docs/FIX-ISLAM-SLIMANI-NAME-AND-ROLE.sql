-- ============================================================================
-- Corriger : Islam Slimani (khalfallahs.ndrc / khalfallah.sndrc)
-- ============================================================================
-- 1. Mettre le bon nom (Islam Slimani) dans employees + auth.users
-- 2. Définir le rôle employé si pas déjà
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. auth.users : first_name, prenom, nom, last_name
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{first_name}', '"Islam"', true
      ),
      '{prenom}', '"Islam"', true
    ),
    '{last_name}', '"Slimani"', true
  ),
  '{nom}', '"Slimani"', true
)
WHERE LOWER(email) IN ('khalfallahs.ndrc@gmail.com', 'khalfallah.sndrc@gmail.com');

-- 2. employees : prenom et nom pour toutes les lignes de ces utilisateurs
UPDATE public.employees
SET prenom = 'Islam', nom = 'Slimani'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE LOWER(email) IN ('khalfallahs.ndrc@gmail.com', 'khalfallah.sndrc@gmail.com')
);

-- 3. Définir comme employé dans leur(s) entreprise(s)
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_company_id UUID;
  v_employee_role_id UUID;
BEGIN
  FOR v_email IN SELECT unnest(ARRAY['khalfallahs.ndrc@gmail.com', 'khalfallah.sndrc@gmail.com'])
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email) LIMIT 1;
    IF v_user_id IS NULL THEN CONTINUE; END IF;
    
    -- Pour chaque company où l'utilisateur est déjà membre
    FOR v_company_id IN 
      SELECT cu.company_id FROM company_users cu WHERE cu.user_id = v_user_id
    LOOP
      SELECT id INTO v_employee_role_id FROM roles 
      WHERE slug = 'employee' AND company_id = v_company_id LIMIT 1;
      
      IF v_employee_role_id IS NULL THEN
        BEGIN
          PERFORM create_system_roles_for_company(v_company_id);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        SELECT id INTO v_employee_role_id FROM roles 
        WHERE slug = 'employee' AND company_id = v_company_id LIMIT 1;
      END IF;
      
      IF v_employee_role_id IS NOT NULL THEN
        UPDATE company_users 
        SET role_id = v_employee_role_id
        WHERE user_id = v_user_id AND company_id = v_company_id;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'OK : Islam Slimani - nom et rôle employé mis à jour';
END $$;

-- Vérification
SELECT u.email, u.raw_user_meta_data->>'first_name' AS first_name, u.raw_user_meta_data->>'nom' AS nom
FROM auth.users u
WHERE LOWER(u.email) IN ('khalfallahs.ndrc@gmail.com', 'khalfallah.sndrc@gmail.com');

SELECT e.prenom, e.nom, e.email
FROM public.employees e
JOIN auth.users u ON u.id = e.user_id
WHERE LOWER(u.email) IN ('khalfallahs.ndrc@gmail.com', 'khalfallah.sndrc@gmail.com');
