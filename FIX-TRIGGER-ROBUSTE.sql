-- =====================================================
-- CORRECTION ROBUSTE : handle_new_user() Trigger
-- =====================================================
-- Problème : Le trigger plante lors de la création d'utilisateur
-- Solution : Gérer tous les cas d'erreur et valeurs NULL
-- =====================================================

-- ═══════════════════════════════════════════════════
-- ÉTAPE 1 : SUPPRIMER L'ANCIEN TRIGGER
-- ═══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ═══════════════════════════════════════════════════
-- ÉTAPE 2 : CRÉER UNE FONCTION ROBUSTE
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Cette fonction ne doit JAMAIS bloquer la création de l'utilisateur
  -- Toutes les erreurs sont capturées et loggées, mais ne remontent pas
  
  -- Créer user_stats (si la table existe)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_stats'
    ) THEN
      INSERT INTO public.user_stats (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating user_stats for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Créer user_settings (si la table existe)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_settings'
    ) THEN
      INSERT INTO public.user_settings (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating user_settings for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Créer user_roles avec 'member' par défaut (CORRIGÉ : 'salarie' → 'member')
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
      -- Vérifier si la colonne role utilise l'enum app_role
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Si l'insertion échoue, on log mais on ne bloque pas
      RAISE WARNING 'Error creating user_roles for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Toujours retourner NEW pour ne pas bloquer la création
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur globale, on log mais on retourne NEW quand même
    -- C'est crucial : si on retourne NULL ou qu'on raise une erreur,
    -- Supabase ne pourra pas créer l'utilisateur
    RAISE WARNING 'Global error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- ÉTAPE 3 : CRÉER LE TRIGGER
-- ═══════════════════════════════════════════════════

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════

-- Vérifier que la fonction est créée
SELECT 
  '✅ Function created' as status,
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Vérifier que le trigger est actif
SELECT 
  '✅ Trigger created' as status,
  trigger_name,
  event_object_table,
  action_timing
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






