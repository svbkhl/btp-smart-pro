-- =====================================================
-- SUPPRIMER LE COMPTE AUTH MAINTENANT
-- User: sabbg.du73100@gmail.com (ID: 35c24ba9-2f27-4067-8087-4fed5200fe5c)
-- =====================================================
-- Les données public (company_users, employees, etc.) sont déjà supprimées.
-- Il reste à supprimer le compte dans auth pour que la personne ne puisse plus se connecter.
--
-- Option A : Exécuter ce script dans Supabase → SQL Editor (Run)
-- Option B : Si "permission denied" → Dashboard → Authentication → Users
--            → chercher sabbg.du73100@gmail.com → ⋮ → Delete user
-- =====================================================

-- Suppression du compte Auth (par ID)
DELETE FROM auth.users
WHERE id = '35c24ba9-2f27-4067-8087-4fed5200fe5c';

-- Vérification : doit retourner 0 lignes après suppression
SELECT id, email FROM auth.users WHERE email = 'sabbg.du73100@gmail.com';
