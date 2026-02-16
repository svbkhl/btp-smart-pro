-- =====================================================
-- Changer le prénom de khalfallahs.ndrc@gmail.com
-- Mise à jour : Islam Slimani (auth + employees)
-- =====================================================
-- Utiliser docs/FIX-ISLAM-SLIMANI-NAME-AND-ROLE.sql à la place
-- =====================================================

-- 1. auth.users : first_name, prenom, nom
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{first_name}', '"Islam"', true
    ),
    '{prenom}', '"Islam"', true
  ),
  '{nom}', '"Slimani"', true
)
WHERE email = 'khalfallahs.ndrc@gmail.com';

-- 2. employees : prenom et nom
UPDATE public.employees
SET prenom = 'Islam', nom = 'Slimani'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'khalfallahs.ndrc@gmail.com');

-- 3. Vérification
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'first_name' AS first_name,
  u.raw_user_meta_data->>'prenom' AS prenom
FROM auth.users u
WHERE u.email = 'khalfallahs.ndrc@gmail.com';

SELECT id, company_id, nom, prenom, email
FROM public.employees
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'khalfallahs.ndrc@gmail.com');
