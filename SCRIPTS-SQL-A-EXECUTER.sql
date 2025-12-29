-- =====================================================
-- SCRIPTS SQL À EXÉCUTER DANS L'ORDRE
-- =====================================================
-- Problème : Erreur 500 "Database error saving new user"
-- Solutions : 
--   1. Supprimer l'utilisateur bloqué
--   2. Corriger le trigger handle_new_user()
-- =====================================================

-- ═══════════════════════════════════════════════════
-- SCRIPT 1 : SUPPRIMER L'UTILISATEUR BLOQUÉ
-- ═══════════════════════════════════════════════════
-- Exécutez ce script en premier

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

-- ═══════════════════════════════════════════════════
-- SCRIPT 2 : CORRIGER LE TRIGGER handle_new_user()
-- ═══════════════════════════════════════════════════
-- Exécutez ce script en deuxième

-- Vérifier et corriger l'enum app_role si nécessaire
DO $$
BEGIN
  -- Vérifier si l'enum existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'member');
  END IF;
END $$;

-- Corriger la fonction handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer user_stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Créer user_settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Créer user_roles avec 'member' par défaut (au lieu de 'salarie')
  -- Vérifier d'abord si la table existe et quelle est sa structure
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    -- Si la colonne role utilise l'enum app_role
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_roles' 
      AND column_name = 'role'
      AND udt_name = 'app_role'
    ) THEN
      -- Utiliser 'member' pour l'enum app_role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'member'::app_role)
      ON CONFLICT (user_id) DO NOTHING;
    ELSE
      -- Si c'est un TEXT avec CHECK, utiliser 'member'
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'member')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne bloque pas la création de l'utilisateur
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════

-- Vérifier que la fonction est correcte
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Vérifier que le trigger est actif
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- =====================================================
-- ✅ APRÈS EXÉCUTION
-- =====================================================
-- 1. Attendez 5-10 secondes (cache Supabase)
-- 2. Testez l'invitation depuis l'application
-- 3. Vérifiez les logs Supabase → Edge Functions → send-invitation → Logs
-- 
-- Résultat attendu :
-- ✅ Invitation sent successfully to: sabbg.du73100@gmail.com
-- =====================================================






