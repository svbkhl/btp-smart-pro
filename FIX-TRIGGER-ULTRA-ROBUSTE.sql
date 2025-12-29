-- =====================================================
-- CORRECTION ULTRA-ROBUSTE : handle_new_user() Trigger
-- =====================================================
-- Ce script garantit que le trigger NE BLOQUE JAMAIS la création d'utilisateur
-- Toutes les erreurs sont capturées et ignorées
-- =====================================================

-- ═══════════════════════════════════════════════════
-- ÉTAPE 1 : SUPPRIMER L'ANCIEN TRIGGER ET FONCTION
-- ═══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ═══════════════════════════════════════════════════
-- ÉTAPE 2 : CRÉER UNE FONCTION ULTRA-ROBUSTE
-- ═══════════════════════════════════════════════════
-- Chaque insertion est dans un bloc BEGIN/EXCEPTION séparé
-- Si une insertion échoue, on continue avec les autres
-- On retourne TOUJOURS NEW pour ne jamais bloquer

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
      -- Log mais ne bloque pas
      RAISE WARNING 'handle_new_user: Error creating user_stats for %: %', NEW.id, SQLERRM;
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
      RAISE WARNING 'handle_new_user: Error creating user_settings for %: %', NEW.id, SQLERRM;
  END;
  
  -- Créer user_roles avec 'member' par défaut
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
      -- Vérifier si c'est un enum ou TEXT
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'role'
        AND udt_name = 'app_role'
      ) THEN
        -- Enum app_role : utiliser 'member'
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'member'::app_role)
        ON CONFLICT (user_id) DO NOTHING;
      ELSE
        -- TEXT avec CHECK : utiliser 'member'
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'member')
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Error creating user_roles for %: %', NEW.id, SQLERRM;
  END;
  
  -- TOUJOURS retourner NEW pour ne pas bloquer la création
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur globale, on log mais on retourne NEW quand même
    -- C'est CRUCIAL : si on ne retourne pas NEW, Supabase ne peut pas créer l'utilisateur
    RAISE WARNING 'handle_new_user: Global error for user %: %', NEW.id, SQLERRM;
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

SELECT 
  '✅ Function handle_new_user created' as status,
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

SELECT 
  '✅ Trigger on_auth_user_created created' as status,
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






