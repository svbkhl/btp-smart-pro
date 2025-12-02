-- =====================================================
-- AJOUTER LES COLONNES POUR L'ENVOI AUTOMATIQUE
-- =====================================================
-- Ce script ajoute les colonnes auto_signature et auto_send_email
-- à la table user_settings pour gérer l'envoi automatique des devis et factures

-- Ajouter auto_signature
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS auto_signature BOOLEAN DEFAULT false;

-- Ajouter auto_send_email
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS auto_send_email BOOLEAN DEFAULT false;

-- Commentaires pour documentation
COMMENT ON COLUMN public.user_settings.auto_signature IS 'Active la signature automatique des devis';
COMMENT ON COLUMN public.user_settings.auto_send_email IS 'Active l''envoi automatique par email des devis et factures aux clients';




