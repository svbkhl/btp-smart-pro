-- =====================================================
-- CORRECTION COMPLÈTE : Tous les Triggers sur auth.users
-- =====================================================
-- Ce script corrige TOUS les triggers pour qu'ils ne bloquent jamais
-- la création d'utilisateur, même avec des valeurs NULL ou manquantes
-- =====================================================

-- ═══════════════════════════════════════════════════
-- ÉTAPE 1 : LISTER TOUS LES TRIGGERS SUR auth.users
-- ═══════════════════════════════════════════════════

SELECT 
  'TRIGGERS ON auth.users' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND action_timing = 'AFTER'
  AND event_manipulation = 'INSERT';

-- ═══════════════════════════════════════════════════
-- ÉTAPE 2 : SUPPRIMER TOUS LES ANCIENS TRIGGERS
-- ═══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_initialize_push_preferences ON auth.users;

-- ═══════════════════════════════════════════════════
-- ÉTAPE 3 : CORRIGER handle_new_user() - ULTRA ROBUSTE
-- ═══════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Cette fonction NE BLOQUE JAMAIS la création d'utilisateur
  -- Toutes les erreurs sont capturées et ignorées
  
  -- Créer user_stats (si la table existe)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_stats'
    ) THEN
      INSERT INTO public.user_stats (user_id, created_at)
      VALUES (
        NEW.id,
        COALESCE(NEW.created_at, now())
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Error creating user_stats for %: %', NEW.id, SQLERRM;
  END;
  
  -- Créer user_settings (si la table existe)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_settings'
    ) THEN
      INSERT INTO public.user_settings (user_id, created_at)
      VALUES (
        NEW.id,
        COALESCE(NEW.created_at, now())
      )
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
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (
          NEW.id,
          'member'::app_role,
          COALESCE(NEW.created_at, now())
        )
        ON CONFLICT (user_id) DO NOTHING;
      ELSE
        -- TEXT avec CHECK : utiliser 'member'
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (
          NEW.id,
          'member',
          COALESCE(NEW.created_at, now())
        )
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
    RAISE WARNING 'handle_new_user: Global error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- ÉTAPE 4 : CRÉER LE TRIGGER on_auth_user_created
-- ═══════════════════════════════════════════════════

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- ÉTAPE 5 : CRÉER trigger_initialize_push_preferences (si nécessaire)
-- ═══════════════════════════════════════════════════
-- Ce trigger est souvent créé pour initialiser les préférences push
-- On le crée de manière robuste aussi

CREATE OR REPLACE FUNCTION public.trigger_initialize_push_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialiser les préférences push (si la table existe)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'push_preferences'
    ) THEN
      INSERT INTO public.push_preferences (user_id, created_at)
      VALUES (
        NEW.id,
        COALESCE(NEW.created_at, now())
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'trigger_initialize_push_preferences: Error for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'trigger_initialize_push_preferences: Global error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger (seulement si la fonction existe et que la table push_preferences existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'trigger_initialize_push_preferences'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'push_preferences'
  ) THEN
    CREATE TRIGGER trigger_initialize_push_preferences
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_initialize_push_preferences();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════

-- Vérifier que la fonction handle_new_user est créée
SELECT 
  '✅ Function handle_new_user' as status,
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Vérifier que le trigger on_auth_user_created est actif
SELECT 
  '✅ Trigger on_auth_user_created' as status,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- Lister tous les triggers sur auth.users
SELECT 
  'All triggers on auth.users' as info,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

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







