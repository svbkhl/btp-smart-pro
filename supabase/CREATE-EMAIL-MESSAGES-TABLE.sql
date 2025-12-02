-- =====================================================
-- TABLE EMAIL_MESSAGES - Historique des emails envoyés
-- =====================================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si elles n'existent pas
DO $$ 
BEGIN
  -- recipient_email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'recipient_email') THEN
    ALTER TABLE public.email_messages ADD COLUMN recipient_email TEXT;
    -- Mettre à jour les valeurs NULL avec une valeur par défaut
    UPDATE public.email_messages SET recipient_email = '' WHERE recipient_email IS NULL;
    -- Maintenant rendre NOT NULL
    ALTER TABLE public.email_messages ALTER COLUMN recipient_email SET NOT NULL;
  END IF;

  -- subject
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'subject') THEN
    ALTER TABLE public.email_messages ADD COLUMN subject TEXT;
    -- Mettre à jour les valeurs NULL avec une valeur par défaut
    UPDATE public.email_messages SET subject = '' WHERE subject IS NULL;
    -- Maintenant rendre NOT NULL
    ALTER TABLE public.email_messages ALTER COLUMN subject SET NOT NULL;
  END IF;

  -- body_html
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'body_html') THEN
    ALTER TABLE public.email_messages ADD COLUMN body_html TEXT;
  END IF;

  -- body_text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'body_text') THEN
    ALTER TABLE public.email_messages ADD COLUMN body_text TEXT;
  END IF;

  -- email_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'email_type') THEN
    ALTER TABLE public.email_messages ADD COLUMN email_type TEXT DEFAULT 'notification';
  END IF;

  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.email_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'sent' 
      CHECK (status IN ('sent', 'failed', 'pending'));
  END IF;

  -- external_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'external_id') THEN
    ALTER TABLE public.email_messages ADD COLUMN external_id TEXT;
  END IF;

  -- error_message
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'error_message') THEN
    ALTER TABLE public.email_messages ADD COLUMN error_message TEXT;
  END IF;

  -- sent_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'sent_at') THEN
    ALTER TABLE public.email_messages ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;

  -- invoice_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'invoice_id') THEN
    ALTER TABLE public.email_messages ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;

  -- quote_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'quote_id') THEN
    ALTER TABLE public.email_messages ADD COLUMN quote_id UUID REFERENCES public.ai_quotes(id) ON DELETE SET NULL;
  END IF;

  -- project_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'email_messages' 
                 AND column_name = 'project_id') THEN
    ALTER TABLE public.email_messages ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;

END $$;

-- Enable RLS
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Policies pour email_messages (supprimer d'abord si elles existent)
DROP POLICY IF EXISTS "Users can view their own email messages" ON public.email_messages;
DROP POLICY IF EXISTS "Service role can manage email messages" ON public.email_messages;

CREATE POLICY "Users can view their own email messages"
  ON public.email_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage email messages"
  ON public.email_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON public.email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON public.email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_created_at ON public.email_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_type ON public.email_messages(email_type);
CREATE INDEX IF NOT EXISTS idx_email_messages_recipient ON public.email_messages(recipient_email);

COMMENT ON TABLE public.email_messages IS 'Historique de tous les emails envoyés depuis l''application';

