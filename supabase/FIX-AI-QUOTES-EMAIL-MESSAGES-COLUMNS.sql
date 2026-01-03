-- =====================================================
-- FIX : Ajouter les colonnes manquantes pour ai_quotes et email_messages
-- =====================================================
-- Ce script ajoute toutes les colonnes nécessaires pour
-- éviter les erreurs PATCH/POST sur ces tables
-- =====================================================

-- 1️⃣ Ajouter les colonnes manquantes à ai_quotes
DO $$ 
BEGIN
    -- Ajouter email_sent_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_quotes' 
        AND column_name = 'email_sent_at'
    ) THEN
        ALTER TABLE public.ai_quotes ADD COLUMN email_sent_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Colonne email_sent_at ajoutée à ai_quotes';
    ELSE
        RAISE NOTICE '✅ Colonne email_sent_at existe déjà dans ai_quotes';
    END IF;

    -- Ajouter sent_at si elle n'existe pas (pour compatibilité)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_quotes' 
        AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE public.ai_quotes ADD COLUMN sent_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Colonne sent_at ajoutée à ai_quotes';
    ELSE
        RAISE NOTICE '✅ Colonne sent_at existe déjà dans ai_quotes';
    END IF;

    -- Ajouter quote_number si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_quotes' 
        AND column_name = 'quote_number'
    ) THEN
        ALTER TABLE public.ai_quotes ADD COLUMN quote_number TEXT;
        RAISE NOTICE '✅ Colonne quote_number ajoutée à ai_quotes';
    ELSE
        RAISE NOTICE '✅ Colonne quote_number existe déjà dans ai_quotes';
    END IF;

    -- Ajouter client_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_quotes' 
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.ai_quotes ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Colonne client_id ajoutée à ai_quotes';
    ELSE
        RAISE NOTICE '✅ Colonne client_id existe déjà dans ai_quotes';
    END IF;

    -- Ajouter company_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_quotes' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.ai_quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Colonne company_id ajoutée à ai_quotes';
    ELSE
        RAISE NOTICE '✅ Colonne company_id existe déjà dans ai_quotes';
    END IF;
END $$;

-- 2️⃣ Créer la table email_messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  email_type TEXT,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL
);

-- 3️⃣ Ajouter les colonnes manquantes à email_messages
DO $$ 
BEGIN
    -- Ajouter document_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_messages' 
        AND column_name = 'document_id'
    ) THEN
        ALTER TABLE public.email_messages ADD COLUMN document_id UUID;
        RAISE NOTICE '✅ Colonne document_id ajoutée à email_messages';
    ELSE
        RAISE NOTICE '✅ Colonne document_id existe déjà dans email_messages';
    END IF;

    -- Ajouter invoice_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_messages' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE public.email_messages ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Colonne invoice_id ajoutée à email_messages';
    ELSE
        RAISE NOTICE '✅ Colonne invoice_id existe déjà dans email_messages';
    END IF;

    -- Ajouter quote_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_messages' 
        AND column_name = 'quote_id'
    ) THEN
        ALTER TABLE public.email_messages ADD COLUMN quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Colonne quote_id ajoutée à email_messages';
    ELSE
        RAISE NOTICE '✅ Colonne quote_id existe déjà dans email_messages';
    END IF;

    -- Ajouter external_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_messages' 
        AND column_name = 'external_id'
    ) THEN
        ALTER TABLE public.email_messages ADD COLUMN external_id TEXT;
        RAISE NOTICE '✅ Colonne external_id ajoutée à email_messages';
    ELSE
        RAISE NOTICE '✅ Colonne external_id existe déjà dans email_messages';
    END IF;

    -- Ajouter error_message si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_messages' 
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE public.email_messages ADD COLUMN error_message TEXT;
        RAISE NOTICE '✅ Colonne error_message ajoutée à email_messages';
    ELSE
        RAISE NOTICE '✅ Colonne error_message existe déjà dans email_messages';
    END IF;
END $$;

-- 4️⃣ Activer RLS sur email_messages si ce n'est pas déjà fait
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- 5️⃣ Supprimer les anciennes policies pour repartir propre
DROP POLICY IF EXISTS "Users can view their own email messages" ON public.email_messages;
DROP POLICY IF EXISTS "Users can insert their own email messages" ON public.email_messages;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.email_messages;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.email_messages;

-- 6️⃣ Créer les policies RLS pour email_messages
CREATE POLICY "Users can view their own email messages"
ON public.email_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email messages"
ON public.email_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 7️⃣ Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON public.email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON public.email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at ON public.email_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_messages_quote_id ON public.email_messages(quote_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_invoice_id ON public.email_messages(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_document_id ON public.email_messages(document_id);

CREATE INDEX IF NOT EXISTS idx_ai_quotes_email_sent_at ON public.ai_quotes(email_sent_at);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_sent_at ON public.ai_quotes(sent_at);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_quote_number ON public.ai_quotes(quote_number);

-- 8️⃣ Vérifier que les colonnes sont bien présentes
SELECT 
  'ai_quotes' as table_name,
  column_name,
  data_type,
  is_nullable,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ai_quotes'
AND column_name IN ('email_sent_at', 'sent_at', 'quote_number', 'client_id', 'company_id')
ORDER BY column_name;

SELECT 
  'email_messages' as table_name,
  column_name,
  data_type,
  is_nullable,
  '✅ Existe' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'email_messages'
AND column_name IN ('document_id', 'invoice_id', 'quote_id', 'external_id', 'error_message', 'sent_at')
ORDER BY column_name;

-- ✅ Script terminé avec succès !
-- Toutes les colonnes nécessaires sont maintenant présentes











