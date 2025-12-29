-- =====================================================
-- TABLE INBOX_EMAILS - Emails entrants (reçus)
-- =====================================================

-- Créer la table pour stocker les emails entrants
CREATE TABLE IF NOT EXISTS public.inbox_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  external_id TEXT, -- ID depuis Gmail/Outlook/etc
  thread_id TEXT, -- ID du thread de conversation
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  folder TEXT DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'archived', 'trash')),
  attachments JSONB, -- Array d'attachments
  headers JSONB, -- Headers de l'email
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inbox_emails ENABLE ROW LEVEL SECURITY;

-- Policies pour inbox_emails
DROP POLICY IF EXISTS "Users can view their own inbox emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Users can manage their own inbox emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Service role can manage inbox emails" ON public.inbox_emails;

CREATE POLICY "Users can view their own inbox emails"
  ON public.inbox_emails
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own inbox emails"
  ON public.inbox_emails
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage inbox emails"
  ON public.inbox_emails
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inbox_emails_user_id ON public.inbox_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_received_at ON public.inbox_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_folder ON public.inbox_emails(folder);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_is_read ON public.inbox_emails(is_read);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_external_id ON public.inbox_emails(external_id);
CREATE INDEX IF NOT EXISTS idx_inbox_emails_thread_id ON public.inbox_emails(thread_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_inbox_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inbox_emails_updated_at_trigger ON public.inbox_emails;
CREATE TRIGGER update_inbox_emails_updated_at_trigger
  BEFORE UPDATE ON public.inbox_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_emails_updated_at();

COMMENT ON TABLE public.inbox_emails IS 'Emails entrants (reçus) depuis Gmail, Outlook, etc.';





