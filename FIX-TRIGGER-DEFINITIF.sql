-- =====================================================
-- CORRECTION DÉFINITIVE : handle_new_user() Trigger
-- =====================================================
-- Problème : Le trigger essaie d'insérer 'salarie' 
-- mais l'enum app_role n'accepte que 'admin' ou 'member'
-- =====================================================

-- ═══════════════════════════════════════════════════
-- ÉTAPE 1 : VÉRIFIER/CORRIGER L'ENUM app_role
-- ═══════════════════════════════════════════════════

-- Vérifier les valeurs de l'enum
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- ═══════════════════════════════════════════════════
-- ÉTAPE 2 : CORRIGER LA FONCTION handle_new_user()
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer user_stats (si la table existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_stats') THEN
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Créer user_settings (si la table existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Créer user_roles avec 'member' par défaut (CORRIGÉ : 'salarie' → 'member')
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    -- Vérifier si la colonne role utilise l'enum app_role
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_roles' 
      AND column_name = 'role'
      AND udt_name = 'app_role'
    ) THEN
      -- Utiliser 'member' pour l'enum app_role (CORRIGÉ)
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
    -- Log l'erreur mais NE BLOQUE PAS la création de l'utilisateur
    -- C'est crucial : si le trigger échoue, Supabase ne peut pas créer l'utilisateur
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- ÉTAPE 3 : RECRÉER LE TRIGGER
-- ═══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════

-- Vérifier que la fonction est créée
SELECT 
  'Function created' as status,
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Vérifier que le trigger est actif
SELECT 
  'Trigger created' as status,
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- =====================================================
-- ✅ APRÈS EXÉCUTION
-- =====================================================
-- 1. Testez l'invitation depuis l'application
-- 2. Vérifiez les logs Supabase → Edge Functions → send-invitation → Logs
-- 
-- Résultat attendu :
-- ✅ Invitation sent successfully to: sabbg.du73100@gmail.com
-- =====================================================







