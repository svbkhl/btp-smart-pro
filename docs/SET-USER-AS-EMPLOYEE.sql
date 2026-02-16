-- ============================================================================
-- Définir un utilisateur comme EMPLOYÉ dans une entreprise
-- ============================================================================
-- Utilisation : remplacez 'EMAIL@exemple.com' et 'COMPANY_ID' par les vraies valeurs
-- 
-- 1. Trouver l'ID de l'utilisateur et de l'entreprise :
--    SELECT id, email FROM auth.users WHERE email = 'utilisateur@exemple.com';
--    SELECT id, name FROM companies LIMIT 5;
-- 
-- 2. Trouver l'ID du rôle "employee" :
--    SELECT id FROM roles WHERE slug = 'employee' AND company_id = 'COMPANY_ID';
-- ============================================================================

-- Option A : Mettre à jour un company_users EXISTANT
-- (Si l'utilisateur est déjà dans l'entreprise avec un autre rôle)
/*
UPDATE company_users cu
SET role_id = (
  SELECT id FROM roles 
  WHERE slug = 'employee' 
  AND company_id = cu.company_id 
  LIMIT 1
)
FROM auth.users u
WHERE cu.user_id = u.id
  AND u.email = 'EMAIL@exemple.com'
  AND cu.company_id = 'COMPANY_ID';
*/

-- Option B : Insérer un company_users si l'utilisateur n'est pas encore dans l'entreprise
-- (Adaptez les UUID et l'email)
/*
INSERT INTO company_users (user_id, company_id, role_id)
SELECT 
  u.id,
  'COMPANY_ID'::uuid,
  (SELECT id FROM roles WHERE slug = 'employee' AND company_id = 'COMPANY_ID'::uuid LIMIT 1)
FROM auth.users u
WHERE u.email = 'EMAIL@exemple.com'
ON CONFLICT (company_id, user_id) DO UPDATE 
SET role_id = EXCLUDED.role_id;
*/

-- ============================================================================
-- INSTRUCTIONS : Remplacez 'VOTRE_EMAIL@exemple.com' par l'email de l'utilisateur
-- ============================================================================

-- Script : définir un utilisateur comme employé
DO $$
DECLARE
  v_email TEXT := 'VOTRE_EMAIL@exemple.com';  -- À MODIFIER
  v_user_id UUID;
  v_company_id UUID;
  v_employee_role_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé avec email: %', v_email;
  END IF;
  
  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune entreprise trouvée';
  END IF;
  
  SELECT id INTO v_employee_role_id FROM roles 
  WHERE slug = 'employee' AND company_id = v_company_id LIMIT 1;
  IF v_employee_role_id IS NULL THEN
    PERFORM create_system_roles_for_company(v_company_id);
    SELECT id INTO v_employee_role_id FROM roles 
    WHERE slug = 'employee' AND company_id = v_company_id LIMIT 1;
  END IF;
  
  INSERT INTO company_users (user_id, company_id, role_id)
  VALUES (v_user_id, v_company_id, v_employee_role_id)
  ON CONFLICT (company_id, user_id) DO UPDATE SET role_id = v_employee_role_id;
  
  RAISE NOTICE 'OK : % défini comme employé', v_email;
END $$;
