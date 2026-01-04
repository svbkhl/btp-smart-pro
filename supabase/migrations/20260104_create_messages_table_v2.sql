-- =====================================================
-- 📧 NOUVELLE TABLE MESSAGES (FROM SCRATCH) - VERSION 2
-- =====================================================
-- Migration idempotente (peut être exécutée plusieurs fois)
-- =====================================================

-- Désactiver temporairement les contraintes FK pour la suppression
SET session_replication_role = 'replica';

-- Supprimer l'ancienne table email_messages si elle existe
DROP TABLE IF EXISTS public.email_messages CASCADE;

-- Supprimer la table messages si elle existe déjà (pour repartir de zéro)
DROP TABLE IF EXISTS public.messages CASCADE;

-- Réactiver les contraintes
SET session_replication_role = 'origin';

-- Créer la nouvelle table messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  user_id UUID NOT NULL,
  client_id UUID,
  
  -- Type et contexte
  message_type TEXT NOT NULL CHECK (message_type IN (
    'quote',           -- Envoi de devis
    'invoice',         -- Envoi de facture
    'payment_link',    -- Envoi de lien de paiement
    'signature',       -- Demande de signature
    'reminder',        -- Relance
    'confirmation',    -- Confirmation (paiement, signature)
    'other'           -- Autre
  )),
  
  -- Documents liés
  document_id UUID,
  document_type TEXT CHECK (document_type IN ('quote', 'invoice', 'payment', 'other')),
  document_number TEXT,
  
  -- Contenu email
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  
  -- Pièces jointes
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Statut et suivi
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  -- Erreurs
  error_message TEXT,
  error_code TEXT,
  
  -- Métadonnées
  external_id TEXT,
  provider TEXT DEFAULT 'resend',
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter les contraintes FK après création de la table
DO $$ 
BEGIN
  -- FK vers auth.users
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.messages 
    ADD CONSTRAINT messages_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- FK vers clients (si la table existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'messages_client_id_fkey'
    ) THEN
      ALTER TABLE public.messages 
      ADD CONSTRAINT messages_client_id_fkey 
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_user_type_date ON public.messages(user_id, message_type, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_client_date ON public.messages(user_id, client_id, sent_at DESC) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_document ON public.messages(document_id, document_type) WHERE document_id IS NOT NULL;

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
DROP POLICY IF EXISTS "Messages are immutable after creation" ON public.messages;
DROP POLICY IF EXISTS "Messages cannot be deleted" ON public.messages;

-- Recréer les policies
CREATE POLICY "Users can view their own messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Messages are immutable after creation"
  ON public.messages
  FOR UPDATE
  USING (false);

CREATE POLICY "Messages cannot be deleted"
  ON public.messages
  FOR DELETE
  USING (false);

-- =====================================================
-- TRIGGER POUR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_messages_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- ✅ MIGRATION TERMINÉE
-- =====================================================

-- Afficher le résultat
DO $$
BEGIN
  RAISE NOTICE '✅ Table messages créée avec succès !';
  RAISE NOTICE 'Nombre de colonnes: %', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'messages' AND table_schema = 'public');
END $$;
