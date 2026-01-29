-- =====================================================
-- Permettre role 'owner' (dirigeant) dans company_invites
-- =====================================================
-- Les invitations "Inviter un dirigeant" doivent pouvoir
-- stocker role = 'owner' pour que l'invité soit dirigeant.
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'company_invites'
      AND constraint_name = 'company_invites_role_check'
  ) THEN
    ALTER TABLE public.company_invites DROP CONSTRAINT company_invites_role_check;
  END IF;
END $$;

ALTER TABLE public.company_invites
ADD CONSTRAINT company_invites_role_check
CHECK (role IN ('owner', 'admin', 'member'));

COMMENT ON CONSTRAINT company_invites_role_check ON public.company_invites IS 'owner=dirigeant, admin=administrateur, member=membre';
