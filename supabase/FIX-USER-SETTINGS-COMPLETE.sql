-- =====================================================
-- FIX COMPLET : Table user_settings avec toutes les colonnes
-- =====================================================
-- Ce script crée/mise à jour la table user_settings
-- avec toutes les colonnes nécessaires pour l'envoi d'emails
-- =====================================================

-- 1️⃣ Vérifier et créer la table user_settings si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'France',
    siret TEXT,
    vat_number TEXT,
    legal_form TEXT,
    company_logo_url TEXT,
    terms_and_conditions TEXT,
    signature_data TEXT,
    signature_name TEXT,
    signature_title TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    reminder_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
    -- Ajouter email si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN email TEXT;
        RAISE NOTICE '✅ Colonne email ajoutée';
    END IF;
    
    -- Ajouter phone si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN phone TEXT;
        RAISE NOTICE '✅ Colonne phone ajoutée';
    END IF;
    
    -- Ajouter address si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN address TEXT;
        RAISE NOTICE '✅ Colonne address ajoutée';
    END IF;
    
    -- Ajouter city si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'city'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN city TEXT;
        RAISE NOTICE '✅ Colonne city ajoutée';
    END IF;
    
    -- Ajouter postal_code si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN postal_code TEXT;
        RAISE NOTICE '✅ Colonne postal_code ajoutée';
    END IF;
    
    -- Ajouter country si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN country TEXT DEFAULT 'France';
        RAISE NOTICE '✅ Colonne country ajoutée';
    END IF;
    
    -- Ajouter siret si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'siret'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN siret TEXT;
        RAISE NOTICE '✅ Colonne siret ajoutée';
    END IF;
    
    -- Ajouter vat_number si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'vat_number'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN vat_number TEXT;
        RAISE NOTICE '✅ Colonne vat_number ajoutée';
    END IF;
    
    -- Ajouter legal_form si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'legal_form'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN legal_form TEXT;
        RAISE NOTICE '✅ Colonne legal_form ajoutée';
    END IF;
    
    -- Ajouter company_logo_url si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'company_logo_url'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN company_logo_url TEXT;
        RAISE NOTICE '✅ Colonne company_logo_url ajoutée';
    END IF;
    
    -- Ajouter terms_and_conditions si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'terms_and_conditions'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN terms_and_conditions TEXT;
        RAISE NOTICE '✅ Colonne terms_and_conditions ajoutée';
    END IF;
    
    -- Ajouter signature_data si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'signature_data'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN signature_data TEXT;
        RAISE NOTICE '✅ Colonne signature_data ajoutée';
    END IF;
    
    -- Ajouter signature_name si elle n'existe pas (COLONNE CRITIQUE)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'signature_name'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN signature_name TEXT;
        RAISE NOTICE '✅ Colonne signature_name ajoutée (CRITIQUE)';
    END IF;
    
    -- Ajouter signature_title si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'signature_title'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN signature_title TEXT;
        RAISE NOTICE '✅ Colonne signature_title ajoutée';
    END IF;
    
    -- Ajouter notifications_enabled si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'notifications_enabled'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Colonne notifications_enabled ajoutée';
    END IF;
    
    -- Ajouter reminder_enabled si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'reminder_enabled'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN reminder_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Colonne reminder_enabled ajoutée';
    END IF;
    
    -- Ajouter email_notifications si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'email_notifications'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN email_notifications BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Colonne email_notifications ajoutée';
    END IF;
    
    -- Ajouter updated_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE '✅ Colonne updated_at ajoutée';
    END IF;
END $$;

-- 3️⃣ Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Supprimer les anciennes policies pour repartir propre
DROP POLICY IF EXISTS "Allow all on user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.user_settings;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.user_settings;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.user_settings;

-- 5️⃣ Créer des politiques RLS appropriées
-- Autoriser SELECT pour les utilisateurs authentifiés (leurs propres settings)
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Autoriser INSERT pour les utilisateurs authentifiés (leurs propres settings)
CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Autoriser UPDATE pour les utilisateurs authentifiés (leurs propres settings)
CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6️⃣ Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_company_name ON public.user_settings(company_name) WHERE company_name IS NOT NULL;

-- 7️⃣ Vérifier que toutes les colonnes sont bien présentes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- 8️⃣ Vérifier que les policies sont bien appliquées
SELECT 
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_settings'
ORDER BY cmd, policyname;

-- 9️⃣ Optionnel : Insérer/mettre à jour les settings pour l'utilisateur test
INSERT INTO public.user_settings (
    user_id, 
    company_name, 
    country, 
    signature_name, 
    signature_title,
    email
)
VALUES (
    'de5b6ce5-9525-4678-83f7-e46538272a54', 
    'Khalfallah', 
    'FR', 
    'Khalfallah', 
    'CEO',
    'sabri.khalfallah6@gmail.com'
)
ON CONFLICT (user_id) 
DO UPDATE SET
    company_name = EXCLUDED.company_name,
    country = EXCLUDED.country,
    signature_name = EXCLUDED.signature_name,
    signature_title = EXCLUDED.signature_title,
    email = EXCLUDED.email,
    updated_at = now();

-- ✅ Script terminé avec succès !
-- La table user_settings est maintenant complète avec toutes les colonnes nécessaires
-- L'envoi d'emails devrait maintenant fonctionner sans erreur 500











