-- ============================================
-- FIX COMPLET : Supprime et recrée TOUT
-- ============================================
-- Ce script supprime TOUTES les politiques RLS existantes
-- puis les recrée proprement
-- ============================================

-- Supprimer TOUTES les politiques RLS existantes
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Supprimer toutes les politiques pour chaque table
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Supprimer TOUS les triggers existants
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT trigger_name, event_object_table, event_object_schema
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND trigger_name LIKE 'update_%_updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', r.trigger_name, r.event_object_schema, r.event_object_table);
  END LOOP;
  
  -- Supprimer aussi le trigger auth
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
END $$;

-- Supprimer TOUTES les fonctions existantes (pour les recréer proprement)
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================
-- MESSAGE DE CONFIRMATION
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Toutes les politiques, triggers et fonctions ont été supprimées';
  RAISE NOTICE '📋 Vous pouvez maintenant exécuter BACKEND-COMPLET.sql';
  RAISE NOTICE '🚀 Il recréera tout proprement sans erreur';
END $$;

