-- ============================================
-- SCRIPT POUR SUPPRIMER TOUS LES COMPTES
-- ============================================
-- ⚠️ ATTENTION : Ce script supprime TOUS les comptes utilisateurs
-- Utilisez-le uniquement si vous voulez repartir de zéro
-- ============================================

-- 1. Supprimer tous les rôles utilisateurs
DELETE FROM public.user_roles;

-- 2. Supprimer tous les employés (si la table existe)
DELETE FROM public.employees;

-- 3. Supprimer toutes les assignations d'employés (si la table existe)
DELETE FROM public.employee_assignments;

-- 4. Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Tous les comptes et rôles ont été supprimés !';
  RAISE NOTICE '';
  RAISE NOTICE '📝 IMPORTANT :';
  RAISE NOTICE '   Les utilisateurs dans auth.users doivent être supprimés manuellement';
  RAISE NOTICE '   depuis le Dashboard Supabase :';
  RAISE NOTICE '   → Authentication → Users → Supprimer chaque utilisateur';
  RAISE NOTICE '';
  RAISE NOTICE '   OU utilisez le script Edge Function "delete-all-users" si disponible';
END $$;

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier qu'il ne reste plus de rôles
SELECT COUNT(*) as nombre_roles_restants FROM public.user_roles;

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Exécutez ce script dans l'éditeur SQL de Supabase
-- 2. Allez dans le Dashboard Supabase → Authentication → Users
-- 3. Supprimez manuellement tous les utilisateurs
-- 4. Créez un nouveau compte depuis l'application

