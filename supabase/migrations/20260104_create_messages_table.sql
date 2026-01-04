-- =====================================================
-- 📧 NOUVELLE TABLE MESSAGES (FROM SCRATCH)
-- =====================================================
-- Table propre et cohérente pour l'historique complet des emails
-- =====================================================

-- Supprimer l'ancienne table email_messages si elle existe
DROP TABLE IF EXISTS public.email_messages CASCADE;

-- Créer la nouvelle table messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
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
  document_id UUID,  -- ID du document (devis, facture, paiement)
  document_type TEXT CHECK (document_type IN ('quote', 'invoice', 'payment', 'other')),
  document_number TEXT, -- Numéro du document (DEVIS-2026-001, etc.)
  
  -- Contenu email
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL, -- Contenu principal (texte brut ou HTML simplifié)
  body_html TEXT,     -- Version HTML complète
  body_text TEXT,     -- Version texte brut
  
  -- Pièces jointes
  attachments JSONB DEFAULT '[]'::jsonb, -- [{name, url, type, size}]
  
  -- Statut et suivi
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  -- Erreurs
  error_message TEXT,
  error_code TEXT,
  
  -- Métadonnées
  external_id TEXT, -- ID du service d'envoi (Resend, etc.)
  provider TEXT DEFAULT 'resend', -- Service utilisé pour l'envoi
  metadata JSONB DEFAULT '{}'::jsonb, -- Données additionnelles
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Index
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT messages_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEX POUR PERFORMANCES
-- =====================================================

-- Index principal pour requêtes fréquentes
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_client_id ON public.messages(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_messages_sent_at ON public.messages(sent_at DESC);
CREATE INDEX idx_messages_status ON public.messages(status);
CREATE INDEX idx_messages_message_type ON public.messages(message_type);

-- Index composite pour filtres combinés
CREATE INDEX idx_messages_user_type_date ON public.messages(user_id, message_type, sent_at DESC);
CREATE INDEX idx_messages_user_client_date ON public.messages(user_id, client_id, sent_at DESC) WHERE client_id IS NOT NULL;

-- Index pour recherche par document
CREATE INDEX idx_messages_document ON public.messages(document_id, document_type) WHERE document_id IS NOT NULL;

-- Index pour recherche full-text (optionnel)
CREATE INDEX idx_messages_subject_search ON public.messages USING gin(to_tsvector('french', subject));
CREATE INDEX idx_messages_body_search ON public.messages USING gin(to_tsvector('french', body));

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs ne voient que leurs propres messages
CREATE POLICY "Users can view their own messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres messages
CREATE POLICY "Users can create their own messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs ne peuvent pas modifier les messages après création
-- (pour garantir l'intégrité de l'audit trail)
CREATE POLICY "Messages are immutable after creation"
  ON public.messages
  FOR UPDATE
  USING (false);

-- Policy: Les utilisateurs ne peuvent pas supprimer les messages
-- (pour garantir l'historique complet)
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

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_messages_updated_at();

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE public.messages IS 'Historique centralisé de toutes les communications (emails) envoyées aux clients';
COMMENT ON COLUMN public.messages.message_type IS 'Type de message: quote, invoice, payment_link, signature, reminder, confirmation, other';
COMMENT ON COLUMN public.messages.document_id IS 'ID du document lié (ai_quotes.id, invoices.id, payments.id)';
COMMENT ON COLUMN public.messages.document_number IS 'Numéro lisible du document (DEVIS-2026-001, FACTURE-2026-001)';
COMMENT ON COLUMN public.messages.attachments IS 'Liste des pièces jointes au format JSON: [{name, url, type, size}]';
COMMENT ON COLUMN public.messages.status IS 'Statut: pending, sent, delivered, opened, failed, bounced';
COMMENT ON COLUMN public.messages.metadata IS 'Métadonnées additionnelles au format JSON';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- ✅ MIGRATION TERMINÉE
-- =====================================================
