-- =====================================================
-- SYSTÈME D'INVITATION ENTREPRISE PRO (SaaS)
-- =====================================================
-- Migration complète pour un système d'invitation sécurisé
-- avec token hashé (SHA256), RLS strict, et gestion cas limites
-- =====================================================

-- =====================================================
-- 1. AJOUTER owner_id À companies (si absent)
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
  END IF;
END $$;

-- =====================================================
-- 2. CRÉER TABLE company_invites (avec token_hash)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')), -- owner ne peut pas être invité
  token_hash TEXT NOT NULL UNIQUE, -- SHA256 du token (jamais stocker le token en clair)
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NULL,
  accepted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);
CREATE INDEX IF NOT EXISTS idx_company_invites_token_hash ON public.company_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_company_invites_status ON public.company_invites(status);
CREATE INDEX IF NOT EXISTS idx_company_invites_expires_at ON public.company_invites(expires_at);

-- Index composite pour éviter doublons pending
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_invites_company_email_pending 
  ON public.company_invites(company_id, email) 
  WHERE status = 'pending';

-- =====================================================
-- 3. AJOUTER status À company_users (si absent)
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'company_users' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.company_users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive'));
    CREATE INDEX IF NOT EXISTS idx_company_users_status ON public.company_users(status);
  END IF;
END $$;

-- =====================================================
-- 4. AJOUTER role_id À company_users (si absent)
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'company_users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.company_users ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_company_users_role_id ON public.company_users(role_id);
  END IF;
END $$;

-- =====================================================
-- 5. FONCTION POUR HASHER TOKEN (SHA256)
-- =====================================================

CREATE OR REPLACE FUNCTION public.hash_token(token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Utiliser pgcrypto pour SHA256
  RETURN encode(digest(token, 'sha256'), 'hex');
END;
$$;

-- =====================================================
-- 6. FONCTION POUR VÉRIFIER ET EXPIRER INVITES
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_old_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_invites
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' 
    AND expires_at < now();
END;
$$;

-- =====================================================
-- 7. TRIGGER POUR METTRE À JOUR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_company_invites_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_company_invites_updated_at ON public.company_invites;
CREATE TRIGGER trigger_update_company_invites_updated_at
  BEFORE UPDATE ON public.company_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_invites_updated_at();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) - COMPANIES
-- =====================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- SELECT : membres de la company
DROP POLICY IF EXISTS "Members can view their company" ON public.companies;
CREATE POLICY "Members can view their company"
  ON public.companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT : user authentifié (création d'entreprise)
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE/DELETE : owner/admin seulement
DROP POLICY IF EXISTS "Owners and admins can update companies" ON public.companies;
CREATE POLICY "Owners and admins can update companies"
  ON public.companies FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Owners and admins can delete companies" ON public.companies;
CREATE POLICY "Owners and admins can delete companies"
  ON public.companies FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) - COMPANY_USERS
-- =====================================================

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- SELECT : membres de la company
DROP POLICY IF EXISTS "Members can view company users" ON public.company_users;
CREATE POLICY "Members can view company users"
  ON public.company_users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT : uniquement via Edge Function (service role) OU owner/admin avec check strict
-- IMPORTANT : Les Edge Functions utilisent service_role, donc bypassent RLS
-- On permet aussi owner/admin pour compatibilité, mais recommandé d'utiliser Edge Functions
DROP POLICY IF EXISTS "Owners and admins can add company users" ON public.company_users;
CREATE POLICY "Owners and admins can add company users"
  ON public.company_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_users.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- UPDATE : owner/admin
DROP POLICY IF EXISTS "Owners and admins can update company users" ON public.company_users;
CREATE POLICY "Owners and admins can update company users"
  ON public.company_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_users.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- DELETE : owner/admin
DROP POLICY IF EXISTS "Owners and admins can delete company users" ON public.company_users;
CREATE POLICY "Owners and admins can delete company users"
  ON public.company_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_users.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) - COMPANY_INVITES
-- =====================================================

ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- SELECT : owner/admin de la company UNIQUEMENT
-- IMPORTANT : L'utilisateur invité (non membre) ne doit PAS pouvoir lire les invites
-- L'acceptation se fait via Edge Function avec vérification token_hash
DROP POLICY IF EXISTS "Owners and admins can view company invites" ON public.company_invites;
CREATE POLICY "Owners and admins can view company invites"
  ON public.company_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- INSERT : owner/admin
DROP POLICY IF EXISTS "Owners and admins can create company invites" ON public.company_invites;
CREATE POLICY "Owners and admins can create company invites"
  ON public.company_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
    AND invited_by = auth.uid()
  );

-- UPDATE : owner/admin (pour revocation)
DROP POLICY IF EXISTS "Owners and admins can update company invites" ON public.company_invites;
CREATE POLICY "Owners and admins can update company invites"
  ON public.company_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- DELETE : owner/admin
DROP POLICY IF EXISTS "Owners and admins can delete company invites" ON public.company_invites;
CREATE POLICY "Owners and admins can delete company invites"
  ON public.company_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- =====================================================
-- 11. FONCTION HELPER : Vérifier si user est owner/admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_company_owner_or_admin(p_company_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = p_company_id
      AND owner_id = p_user_id
  );
END;
$$;

-- =====================================================
-- 12. CRON JOB : Expirer les invites automatiquement
-- =====================================================

-- Activer pg_cron si disponible
-- SELECT cron.schedule('expire-invites', '0 * * * *', 'SELECT public.expire_old_invites();');

-- =====================================================
-- 13. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE public.company_invites IS 'Invitations sécurisées avec token hashé (SHA256)';
COMMENT ON COLUMN public.company_invites.token_hash IS 'SHA256 du token (jamais stocker le token en clair)';
COMMENT ON COLUMN public.company_invites.role IS 'Rôle proposé (admin ou member, jamais owner)';
COMMENT ON FUNCTION public.hash_token IS 'Hash un token avec SHA256';
COMMENT ON FUNCTION public.expire_old_invites IS 'Marque les invites expirées comme expired';
