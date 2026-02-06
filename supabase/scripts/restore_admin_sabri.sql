-- =====================================================
-- Restaurer les parametres admin pour sabri.khalfallah6@gmail.com
-- =====================================================
-- Supabase Dashboard -> SQL Editor -> New query
-- Coller et executer chaque bloc separement si besoin.
-- =====================================================

-- 1. Admin systeme (raw_user_meta_data)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_system_admin}',
  'true'::jsonb,
  true
)
WHERE email = 'sabri.khalfallah6@gmail.com';

-- 2. Role admin dans user_roles (ignorer l'erreur si la table n'existe pas)
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sabri.khalfallah6@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'sabri.khalfallah6@gmail.com';

-- 3. Verification
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'is_system_admin' AS is_system_admin,
  ur.role AS user_roles_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'sabri.khalfallah6@gmail.com';
