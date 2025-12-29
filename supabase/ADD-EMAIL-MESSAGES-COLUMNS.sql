-- =====================================================
-- AJOUTER LES COLONNES MANQUANTES À EMAIL_MESSAGES
-- =====================================================
-- Ce script ajoute toutes les colonnes nécessaires
-- à la table email_messages si elles n'existent pas

-- recipient_email
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Mettre à jour les valeurs NULL
UPDATE public.email_messages 
SET recipient_email = '' 
WHERE recipient_email IS NULL;

-- Rendre NOT NULL
ALTER TABLE public.email_messages 
ALTER COLUMN recipient_email SET NOT NULL;

-- subject
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Mettre à jour les valeurs NULL
UPDATE public.email_messages 
SET subject = '' 
WHERE subject IS NULL;

-- Rendre NOT NULL
ALTER TABLE public.email_messages 
ALTER COLUMN subject SET NOT NULL;

-- body_html
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS body_html TEXT;

-- body_text
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS body_text TEXT;

-- email_type
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'notification';

-- status
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- Ajouter la contrainte CHECK si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_messages_status_check'
  ) THEN
    ALTER TABLE public.email_messages 
    ADD CONSTRAINT email_messages_status_check 
    CHECK (status IN ('sent', 'failed', 'pending'));
  END IF;
END $$;

-- Rendre NOT NULL pour status
ALTER TABLE public.email_messages 
ALTER COLUMN status SET NOT NULL;

-- external_id
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- error_message
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- sent_at
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- invoice_id (avec vérification de la table invoices)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'invoices') THEN
    ALTER TABLE public.email_messages 
    ADD COLUMN IF NOT EXISTS invoice_id UUID 
    REFERENCES public.invoices(id) ON DELETE SET NULL;
  ELSE
    ALTER TABLE public.email_messages 
    ADD COLUMN IF NOT EXISTS invoice_id UUID;
  END IF;
END $$;

-- quote_id (avec vérification de la table ai_quotes)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'ai_quotes') THEN
    ALTER TABLE public.email_messages 
    ADD COLUMN IF NOT EXISTS quote_id UUID 
    REFERENCES public.ai_quotes(id) ON DELETE SET NULL;
  ELSE
    ALTER TABLE public.email_messages 
    ADD COLUMN IF NOT EXISTS quote_id UUID;
  END IF;
END $$;

-- project_id (avec vérification de la table projects)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'projects') THEN
    ALTER TABLE public.email_messages 
    ADD COLUMN IF NOT EXISTS project_id UUID 
    REFERENCES public.projects(id) ON DELETE SET NULL;
  ELSE
    ALTER TABLE public.email_messages 
    ADD COLUMN IF NOT EXISTS project_id UUID;
  END IF;
END $$;

















