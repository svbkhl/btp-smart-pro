-- =====================================================
-- CORRECTION : handle_new_user() pour invitations
-- =====================================================
-- Problème : La fonction essaie d'insérer 'salarie' 
-- mais l'enum app_role n'accepte que 'admin' ou 'member'
-- =====================================================

-- Vérifier et corriger l'enum app_role si nécessaire
DO $$
BEGIN
  -- Vérifier si l'enum existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'member');
  END IF;
  
  -- Supprimer les valeurs invalides si elles existent
  -- (on ne peut pas supprimer des valeurs d'enum directement, donc on recrée)
  -- Mais on va juste s'assurer que la fonction utilise les bonnes valeurs
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

-- Vérifier que le trigger existe et est actif
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VÉRIFICATION
-- =====================================================
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







