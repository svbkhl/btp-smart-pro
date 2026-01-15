-- =====================================================
-- SYSTÈME D'INVITATION SAAS PRO
-- =====================================================
-- Système complet d'invitation avec sécurité maximale :
-- - Token hashé (SHA256) pour sécurité
-- - RLS strictes
-- - Gestion cas limites (expiré, accepté, révoqué, doublons)
-- - Multi-entreprise support
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER/CRÉER TABLE companies (si nécessaire)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) THEN
    CREATE TABLE public.companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      plan TEXT DEFAULT 'custom' CHECK (plan IN ('basic', 'pro', 'enterprise', 'custom')),
      features JSONB DEFAULT '{}'::jsonb,
      settings JSONB DEFAULT '{}'::jsonb,
      support_level INTEGER DEFAULT 0 CHECK (support_level IN (0, 1, 2)),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'no_support')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
    CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
    
    RAISE NOTICE '✅ Table companies créée';
  ELSE
    -- Ajouter owner_id si manquant
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'owner_id'
    ) THEN
      ALTER TABLE public.companies ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
      RAISE NOTICE '✅ Colonne owner_id ajoutée à companies';
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2. VÉRIFIER/CRÉER TABLE company_users (si nécessaire)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'company_users'
  ) THEN
    CREATE TABLE public.company_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(company_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users(role);
    CREATE INDEX IF NOT EXISTS idx_company_users_status ON public.company_users(status);
    
    RAISE NOTICE '✅ Table company_users créée';
  ELSE
    -- Ajouter status si manquant
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'company_users' AND column_name = 'status'
    ) THEN
      ALTER TABLE public.company_users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive'));
      CREATE INDEX IF NOT EXISTS idx_company_users_status ON public.company_users(status);
      RAISE NOTICE '✅ Colonne status ajoutée à company_users';
    END IF;
  END IF;
END $$;

-- =====================================================
-- 3. CRÉER TABLE company_invites (NOUVELLE - SÉCURISÉE)
-- =====================================================

-- Supprimer l'ancienne table invitations si elle existe et créer la nouvelle
DROP TABLE IF EXISTS public.company_invites CASCADE;

CREATE TABLE public.company_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')), -- owner ne peut pas être invité
  token_hash TEXT NOT NULL UNIQUE, -- SHA256 du token (jamais en clair)
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX idx_company_invites_email ON public.company_invites(email);
CREATE INDEX idx_company_invites_token_hash ON public.company_invites(token_hash);
CREATE INDEX idx_company_invites_status ON public.company_invites(status);
CREATE INDEX idx_company_invites_expires_at ON public.company_invites(expires_at);

-- Contrainte unique : une seule invitation pending par (company_id, email)
-- Utiliser un index partiel unique au lieu d'une contrainte UNIQUE avec WHERE
CREATE UNIQUE INDEX idx_company_invites_unique_pending 
  ON public.company_invites(company_id, email) 
  WHERE status = 'pending';

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) - SÉCURITÉ MAXIMALE
-- =====================================================

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4.1. RLS POLICIES pour companies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
CREATE POLICY "Users can view their companies"
  ON public.companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners and admins can update companies" ON public.companies;
CREATE POLICY "Owners and admins can update companies"
  ON public.companies FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners can delete companies" ON public.companies;
CREATE POLICY "Owners can delete companies"
  ON public.companies FOR DELETE
  USING (owner_id = auth.uid());

-- =====================================================
-- 4.2. RLS POLICIES pour company_users
-- =====================================================

DROP POLICY IF EXISTS "Users can view their company memberships" ON public.company_users;
CREATE POLICY "Users can view their company memberships"
  ON public.company_users FOR SELECT
  USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE uniquement via Edge Functions (service role)
-- Les policies suivantes sont restrictives pour sécurité
DROP POLICY IF EXISTS "Service role can manage company_users" ON public.company_users;
CREATE POLICY "Service role can manage company_users"
  ON public.company_users FOR ALL
  USING (false) -- Bloqué par défaut, Edge Functions utilisent service_role
  WITH CHECK (false);

-- Exception : owners/admins peuvent inviter (mais via Edge Function recommandé)
DROP POLICY IF EXISTS "Owners and admins can invite users" ON public.company_users;
CREATE POLICY "Owners and admins can invite users"
  ON public.company_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_users.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 4.3. RLS POLICIES pour company_invites (SÉCURITÉ MAXIMALE)
-- =====================================================

-- SELECT : Seuls les owners/admins de la company peuvent voir les invitations
DROP POLICY IF EXISTS "Owners and admins can view invites" ON public.company_invites;
CREATE POLICY "Owners and admins can view invites"
  ON public.company_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- INSERT : Seuls les owners/admins peuvent créer des invitations
DROP POLICY IF EXISTS "Owners and admins can create invites" ON public.company_invites;
CREATE POLICY "Owners and admins can create invites"
  ON public.company_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    AND invited_by = auth.uid()
  );

-- UPDATE : Seuls les owners/admins peuvent révoquer
DROP POLICY IF EXISTS "Owners and admins can update invites" ON public.company_invites;
CREATE POLICY "Owners and admins can update invites"
  ON public.company_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- DELETE : Seuls les owners/admins peuvent supprimer
DROP POLICY IF EXISTS "Owners and admins can delete invites" ON public.company_invites;
CREATE POLICY "Owners and admins can delete invites"
  ON public.company_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = company_invites.company_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- IMPORTANT : L'utilisateur invité (non membre) NE PEUT PAS lire les invites
-- La vérification se fait via Edge Function avec service_role

-- =====================================================
-- 5. FONCTION HELPER : Hash token (SHA256)
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
-- 6. FONCTION : Nettoyer les invitations expirées
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.company_invites
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- 7. TRIGGER : Mettre à jour updated_at
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
-- 8. FONCTION : Vérifier si user est déjà membre
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_user_company_member(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND status = 'active'
  );
END;
$$;

-- =====================================================
-- 9. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE public.company_invites IS 'Invitations sécurisées avec token hashé (SHA256)';
COMMENT ON COLUMN public.company_invites.token_hash IS 'Hash SHA256 du token (jamais stocké en clair)';
COMMENT ON COLUMN public.company_invites.status IS 'pending, accepted, revoked, expired';
COMMENT ON INDEX idx_company_invites_unique_pending IS 'Une seule invitation pending par (company_id, email)';

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
