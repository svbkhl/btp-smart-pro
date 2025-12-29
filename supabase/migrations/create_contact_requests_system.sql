-- =====================================================
-- SYSTÈME DE DEMANDES DE CONTACT
-- =====================================================
-- Table pour stocker les demandes de contact/essai gratuit
-- des visiteurs non démarchés
-- =====================================================

-- =====================================================
-- 1. TABLE: contact_requests
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  entreprise TEXT,
  message TEXT,
  request_type TEXT DEFAULT 'essai_gratuit' CHECK (request_type IN ('essai_gratuit', 'contact', 'information')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'invited', 'rejected')),
  trial_requested BOOLEAN DEFAULT false,
  admin_notes TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON public.contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_requests_request_type ON public.contact_requests(request_type);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Seuls les admins peuvent voir toutes les demandes
CREATE POLICY "Admins can view all contact requests"
  ON public.contact_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Policy: N'importe qui peut créer une demande (visiteurs non connectés)
-- On utilise une fonction SECURITY DEFINER pour permettre l'insertion sans auth
CREATE OR REPLACE FUNCTION create_contact_request(
  p_nom TEXT,
  p_prenom TEXT,
  p_email TEXT,
  p_telephone TEXT DEFAULT NULL,
  p_entreprise TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_request_type TEXT DEFAULT 'essai_gratuit',
  p_trial_requested BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
BEGIN
  INSERT INTO public.contact_requests (
    nom,
    prenom,
    email,
    telephone,
    entreprise,
    message,
    request_type,
    trial_requested
  )
  VALUES (
    p_nom,
    p_prenom,
    p_email,
    p_telephone,
    p_entreprise,
    p_message,
    p_request_type,
    p_trial_requested
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Les admins peuvent mettre à jour les demandes
CREATE POLICY "Admins can update contact requests"
  ON public.contact_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- =====================================================
-- 3. TRIGGER: Mettre à jour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_contact_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contact_requests_updated_at ON public.contact_requests;
CREATE TRIGGER trigger_update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_requests_updated_at();

-- =====================================================
-- 4. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE public.contact_requests IS 'Demandes de contact et essais gratuits des visiteurs non démarchés';
COMMENT ON COLUMN public.contact_requests.request_type IS 'Type de demande: essai_gratuit, contact, information';
COMMENT ON COLUMN public.contact_requests.status IS 'Statut: pending, contacted, invited, rejected';
COMMENT ON COLUMN public.contact_requests.trial_requested IS 'Si true, le visiteur a demandé un essai gratuit de 2 semaines';
COMMENT ON FUNCTION create_contact_request IS 'Fonction pour créer une demande de contact sans authentification';














