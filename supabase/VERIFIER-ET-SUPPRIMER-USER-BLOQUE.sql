-- =====================================================
-- VÉRIFICATION ET SUPPRESSION D'UN UTILISATEUR BLOQUÉ
-- =====================================================
-- Problème : "Database error saving new user"
-- Cause : Utilisateur fantôme ou corrompu dans auth.users/auth.identities
-- =====================================================

-- ═══════════════════════════════════════════════════
-- ÉTAPE 1 : VÉRIFIER SI L'EMAIL EXISTE DANS auth.users
-- ═══════════════════════════════════════════════════

SELECT 
  id, 
  email, 
  created_at, 
  last_sign_in_at,
  email_confirmed_at,
  deleted_at
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';

-- ═══════════════════════════════════════════════════
-- ÉTAPE 2 : VÉRIFIER LES IDENTITÉS LIÉES
-- ═══════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════
-- ÉTAPE 3 : SUPPRIMER (si des lignes existent)
-- ═══════════════════════════════════════════════════
-- ⚠️ ATTENTION : Exécutez seulement si vous voyez des résultats aux requêtes ci-dessus
-- ⚠️ L'ordre est important : identities d'abord, puis users

-- Supprimer les identités d'abord
DELETE FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
   OR user_id IN (
     SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com'
   );

-- Supprimer l'utilisateur ensuite
DELETE FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';

-- ═══════════════════════════════════════════════════
-- ÉTAPE 4 : VÉRIFICATION APRÈS SUPPRESSION
-- ═══════════════════════════════════════════════════

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

-- Si les deux compteurs sont à 0 → ✅ C'est bon, vous pouvez réinviter






