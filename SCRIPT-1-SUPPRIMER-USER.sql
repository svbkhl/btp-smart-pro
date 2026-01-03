-- =====================================================
-- SCRIPT 1 : SUPPRIMER L'UTILISATEUR BLOQUÉ
-- =====================================================
-- Copiez-collez ce script dans Supabase SQL Editor
-- =====================================================

-- Vérifier si l'utilisateur existe
SELECT 
  id, 
  email, 
  created_at, 
  last_sign_in_at,
  email_confirmed_at,
  deleted_at
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';

-- Vérifier les identités liées
SELECT 
  id,
  user_id,
  identity_data->>'email' as email,
  provider,
  created_at,
  updated_at
FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
   OR user_id IN (
     SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com'
   );

-- Supprimer les identités d'abord (IMPORTANT : ordre crucial)
DELETE FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
   OR user_id IN (
     SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com'
   );

-- Supprimer l'utilisateur ensuite
DELETE FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';

-- Vérifier que tout a été supprimé
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com'

UNION ALL

SELECT 
  'auth.identities' as table_name,
  COUNT(*) as count
FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com';







