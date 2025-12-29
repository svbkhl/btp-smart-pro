-- ============================================
-- SCRIPT POUR SUPPRIMER L'UTILISATEUR
-- Email: sabbg.du73100@gmail.com
-- ============================================
-- ⚠️ Ce script supprime l'utilisateur avec l'email sabbg.du73100@gmail.com
-- ============================================

-- 1. Vérifier si l'utilisateur existe
DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Chercher l'utilisateur par email
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email ILIKE 'sabbg.du73100@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Aucun utilisateur trouvé avec l''email "sabbg.du73100@gmail.com"';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Utilisateur trouvé :';
  RAISE NOTICE '   - ID : %', v_user_id;
  RAISE NOTICE '   - Email : %', v_user_email;
  RAISE NOTICE '';
  
  -- 2. Supprimer les rôles de l'utilisateur
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Rôles supprimés de user_roles';
  
  -- 3. Supprimer les données liées dans company_users (si existe)
  DELETE FROM public.company_users WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Données supprimées de company_users';
  
  -- 4. Supprimer les données liées dans employees (si existe)
  DELETE FROM public.employees WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Données supprimées de employees';
  
  -- 5. Supprimer les données liées dans user_settings (si existe)
  DELETE FROM public.user_settings WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Données supprimées de user_settings';
  
  -- 6. Supprimer les données liées dans invitations (si existe)
  DELETE FROM public.invitations WHERE email = v_user_email;
  RAISE NOTICE '✅ Données supprimées de invitations';
  
  -- 7. Supprimer les identités liées (IMPORTANT : avant de supprimer l'utilisateur)
  DELETE FROM auth.identities
  WHERE user_id = v_user_id
     OR identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com';
  RAISE NOTICE '✅ Identités supprimées de auth.identities';
  
  -- 8. Supprimer l'utilisateur de auth.users
  DELETE FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE '✅ Utilisateur supprimé de auth.users';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Toutes les données ont été supprimées avec succès !';
  
END $$;

-- ============================================
-- SUPPRESSION DIRECTE (si le bloc DO ne fonctionne pas)
-- ============================================
-- ⚠️ Décommentez ces lignes si nécessaire

-- Supprimer les identités d'abord (IMPORTANT : ordre crucial)
-- DELETE FROM auth.identities
-- WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
--    OR user_id IN (
--      SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com'
--    );

-- Supprimer l'utilisateur ensuite
-- DELETE FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier qu'il ne reste plus de données pour cet utilisateur
SELECT 
  'user_roles' as table_name,
  COUNT(*) as count
FROM public.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com')
UNION ALL
SELECT 
  'company_users' as table_name,
  COUNT(*) as count
FROM public.company_users
WHERE user_id IN (SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com')
UNION ALL
SELECT 
  'employees' as table_name,
  COUNT(*) as count
FROM public.employees
WHERE user_id IN (SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com')
UNION ALL
SELECT 
  'user_settings' as table_name,
  COUNT(*) as count
FROM public.user_settings
WHERE user_id IN (SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com');

-- Vérifier l'utilisateur dans auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';

-- Vérifier les identités dans auth.identities
SELECT id, user_id, identity_data->>'email' as email, provider
FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
   OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com');





