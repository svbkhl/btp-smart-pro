-- ============================================
-- SCRIPT DE DIAGNOSTIC ET CRÉATION DES TABLES
-- ============================================
-- Ce script vérifie l'existence des tables et les crée si nécessaire
-- Il vérifie aussi les RLS policies et les crée si manquantes
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard > SQL Editor
-- 2. Copiez TOUT le contenu de ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez sur "Run"
-- 5. Vérifiez les messages dans les résultats
-- ============================================

-- ============================================
-- 1. VÉRIFIER ET CRÉER LA TABLE clients
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    CREATE TABLE public.clients (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      location TEXT,
      avatar_url TEXT,
      status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'terminé', 'planifié', 'VIP')),
      total_spent NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
    
    RAISE NOTICE '✅ Table clients créée';
  ELSE
    RAISE NOTICE 'ℹ️ Table clients existe déjà';
  END IF;
END $$;

-- ============================================
-- 2. VÉRIFIER ET CRÉER LA TABLE user_settings
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
    CREATE TABLE public.user_settings (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      country TEXT,
      company_logo_url TEXT,
      siret TEXT,
      vat_number TEXT,
      legal_form TEXT,
      terms_and_conditions TEXT,
      signature_data TEXT,
      signature_name TEXT,
      notifications_enabled BOOLEAN DEFAULT true,
      reminder_enabled BOOLEAN DEFAULT true,
      email_notifications BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
    
    RAISE NOTICE '✅ Table user_settings créée';
  ELSE
    RAISE NOTICE 'ℹ️ Table user_settings existe déjà';
  END IF;
END $$;

-- ============================================
-- 3. ACTIVER RLS SUR LES TABLES
-- ============================================

ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CRÉER LES POLICIES RLS POUR clients
-- ============================================

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Créer les policies
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = user_id);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Policies RLS pour clients créées';
END $$;

-- ============================================
-- 5. CRÉER LES POLICIES RLS POUR user_settings
-- ============================================

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can create their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;

-- Créer les policies
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$ 
BEGIN
  RAISE NOTICE '✅ Policies RLS pour user_settings créées';
END $$;

-- ============================================
-- 6. CRÉER LES TRIGGERS POUR updated_at
-- ============================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger pour clients
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DO $$ 
BEGIN
  RAISE NOTICE '✅ Triggers updated_at créés';
END $$;

-- ============================================
-- 7. CRÉER LES SETTINGS POUR LES UTILISATEURS EXISTANTS
-- ============================================

-- Créer un enregistrement user_settings pour chaque utilisateur qui n'en a pas
DO $$ 
BEGIN
  INSERT INTO public.user_settings (user_id)
  SELECT id FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM public.user_settings)
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE '✅ Settings créés pour les utilisateurs existants';
END $$;

-- ============================================
-- 8. VÉRIFICATION FINALE
-- ============================================

DO $$ 
DECLARE
  clients_count INTEGER;
  settings_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO clients_count FROM public.clients;
  SELECT COUNT(*) INTO settings_count FROM public.user_settings;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VÉRIFICATION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table clients : % enregistrements', clients_count;
  RAISE NOTICE 'Table user_settings : % enregistrements', settings_count;
  RAISE NOTICE '========================================';
END $$;

