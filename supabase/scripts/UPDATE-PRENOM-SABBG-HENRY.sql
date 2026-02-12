-- =====================================================
-- Afficher "Henry" pour sabbg.du73100@gmail.com sur le dashboard
-- (auth.users + employees)
-- =====================================================
-- Supabase Dashboard → SQL Editor → New query → Coller et exécuter
-- =====================================================

-- 1. auth.users : first_name et prenom dans raw_user_meta_data
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{first_name}',
    '"Henry"',
    true
  ),
  '{prenom}',
  '"Henry"',
  true
)
WHERE email = 'sabbg.du73100@gmail.com';

-- 2. employees : prenom pour toutes les lignes de cet utilisateur
UPDATE public.employees
SET prenom = 'Henry'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sabbg.du73100@gmail.com');

-- 3. Vérification
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'first_name' AS first_name,
  u.raw_user_meta_data->>'prenom' AS prenom
FROM auth.users u
WHERE u.email = 'sabbg.du73100@gmail.com';

SELECT id, company_id, nom, prenom, email
FROM public.employees
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sabbg.du73100@gmail.com');
