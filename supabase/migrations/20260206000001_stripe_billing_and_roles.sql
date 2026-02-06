-- =====================================================
-- Stripe Billing B2B + Rôles Owner/Member uniquement
-- =====================================================
-- 1. Colonnes Stripe Billing sur companies (1 company = 1 Customer = 1 Subscription)
-- 2. Table idempotence webhooks Stripe
-- 3. Retrait du rôle admin : uniquement owner et member
-- =====================================================

-- =====================================================
-- 1. COLONNES STRIPE BILLING SUR companies
-- =====================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IS NULL OR subscription_status IN (
      'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
    )),
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id
  ON public.companies(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription_id
  ON public.companies(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status
  ON public.companies(subscription_status) WHERE subscription_status IS NOT NULL;

COMMENT ON COLUMN public.companies.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) - 1 par entreprise';
COMMENT ON COLUMN public.companies.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN public.companies.subscription_status IS 'trialing, active, past_due, canceled, etc.';
COMMENT ON COLUMN public.companies.trial_end IS 'Fin de la période d''essai gratuit';
COMMENT ON COLUMN public.companies.current_period_end IS 'Fin de la période de facturation en cours';
COMMENT ON COLUMN public.companies.cancel_at_period_end IS 'Annulation en fin de période (accès jusqu''à current_period_end)';

-- =====================================================
-- 2. TABLE IDEMPOTENCE WEBHOOKS STRIPE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
  ON public.stripe_webhook_events(event_id);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Seul le service role / Edge Functions insère (pas d'accès direct depuis l'app)
CREATE POLICY "Service role can manage stripe_webhook_events"
  ON public.stripe_webhook_events FOR ALL
  USING (false)
  WITH CHECK (false);

-- =====================================================
-- 3. RÔLES : UNIQUEMENT owner ET member (retrait de admin)
-- =====================================================

-- 3.1 company_users : migrer admin -> owner, puis contrainte (owner, member)
DO $$
DECLARE
  cname TEXT;
BEGIN
  UPDATE public.company_users SET role = 'owner' WHERE role = 'admin';
  FOR cname IN (SELECT conname FROM pg_constraint WHERE conrelid = 'public.company_users'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%role%')
  LOOP
    EXECUTE format('ALTER TABLE public.company_users DROP CONSTRAINT %I', cname);
  END LOOP;
  ALTER TABLE public.company_users ADD CONSTRAINT company_users_role_check CHECK (role IN ('owner', 'member'));
END $$;

-- 3.2 invitations : migrer admin -> owner, puis contrainte (owner, member)
DO $$
DECLARE
  cname TEXT;
BEGIN
  UPDATE public.invitations SET role = 'owner' WHERE role = 'admin';
  FOR cname IN (SELECT conname FROM pg_constraint WHERE conrelid = 'public.invitations'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%role%')
  LOOP
    EXECUTE format('ALTER TABLE public.invitations DROP CONSTRAINT %I', cname);
  END LOOP;
  ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('owner', 'member'));
END $$;

-- Note: Les policies RLS qui référencent 'admin' doivent être mises à jour pour n'utiliser que 'owner'.
-- Les policies existantes "role IN ('owner', 'admin')" sont mises à jour ci-dessous.

-- 3.3 Policies companies : remplacer admin par owner uniquement
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
CREATE POLICY "Owners can manage their company"
  ON public.companies FOR ALL
  USING (
    id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 3.4 Policies company_users : seul owner peut gérer
DROP POLICY IF EXISTS "Admins can manage company_users" ON public.company_users;
CREATE POLICY "Owners can manage company_users"
  ON public.company_users FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 3.5 Policies invitations : owner peut créer/voir (remplace admin par owner)
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins and owners can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Owners can view their company invitations" ON public.invitations;

CREATE POLICY "Owners can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can view company invitations"
  ON public.invitations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners can update company invitations"
  ON public.invitations FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Politique "Admins can view all invitations" : si elle existe pour user_roles.administrateur, on la garde
-- Sinon les owners voient déjà leurs invitations. On ne recrée pas une policy "admin système" ici.
