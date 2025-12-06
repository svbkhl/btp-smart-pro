-- =====================================================
-- CORRECTION DES COLONNES POUR LE TRACKING DES EMAILS
-- =====================================================
-- Ce script ajoute les colonnes manquantes pour le tracking des emails :
-- 1. ai_quotes.sent_at (timestamptz)
-- 2. ai_quotes.signed_at (timestamptz) - si n'existe pas déjà
-- 3. email_messages.document_id (uuid)
-- 4. email_messages.sent_at (timestamptz) - si n'existe pas déjà
-- =====================================================

-- =====================================================
-- 1. COLONNES POUR ai_quotes
-- =====================================================

-- Ajouter sent_at si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    
    COMMENT ON COLUMN public.ai_quotes.sent_at IS 'Date et heure d''envoi du devis par email';
  END IF;
END $$;

-- Ajouter signed_at si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
    
    COMMENT ON COLUMN public.ai_quotes.signed_at IS 'Date et heure de signature du devis';
  END IF;
END $$;

-- =====================================================
-- 2. COLONNES POUR email_messages
-- =====================================================

-- Vérifier si la table email_messages existe, sinon la créer
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'invoice')),
  document_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT
);

-- Ajouter document_id si la table existe déjà mais sans cette colonne
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages' 
    AND column_name = 'document_id'
  ) THEN
    ALTER TABLE public.email_messages 
    ADD COLUMN document_id UUID;
    
    COMMENT ON COLUMN public.email_messages.document_id IS 'ID du document (devis ou facture) associé à cet email';
  END IF;
END $$;

-- Ajouter sent_at si elle n'existe pas
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.email_messages 
    ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    
    COMMENT ON COLUMN public.email_messages.sent_at IS 'Date et heure d''envoi de l''email';
  END IF;
END $$;

-- =====================================================
-- 3. INDEXES POUR PERFORMANCE
-- =====================================================

-- Indexes pour ai_quotes
CREATE INDEX IF NOT EXISTS idx_ai_quotes_sent_at ON public.ai_quotes(sent_at);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_signed_at ON public.ai_quotes(signed_at);

-- Indexes pour email_messages
CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON public.email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_document_id ON public.email_messages(document_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_document_type ON public.email_messages(document_type);
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at ON public.email_messages(sent_at);

-- =====================================================
-- 4. RLS POLICIES POUR email_messages
-- =====================================================

-- Activer RLS si pas déjà activé
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre aux utilisateurs de voir leurs propres emails
DROP POLICY IF EXISTS "Users can view their own email messages" ON public.email_messages;
CREATE POLICY "Users can view their own email messages"
  ON public.email_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs d'insérer leurs propres emails
DROP POLICY IF EXISTS "Users can insert their own email messages" ON public.email_messages;
CREATE POLICY "Users can insert their own email messages"
  ON public.email_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de mettre à jour leurs propres emails
DROP POLICY IF EXISTS "Users can update their own email messages" ON public.email_messages;
CREATE POLICY "Users can update their own email messages"
  ON public.email_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. VÉRIFICATION
-- =====================================================

-- Afficher les colonnes ajoutées
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('ai_quotes', 'email_messages')
  AND column_name IN ('sent_at', 'signed_at', 'document_id')
ORDER BY table_name, column_name;



