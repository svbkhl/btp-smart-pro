-- ============================================================================
-- SCRIPT 1/2 : Créer la table user_permissions
-- COPIEZ ET COLLEZ CE SCRIPT DANS SUPABASE SQL EDITOR
-- ============================================================================

-- 1) Créer la table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_permissions_unique UNIQUE(user_id, company_id, permission_id)
);

-- 2) Créer les index
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company_id ON public.user_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted ON public.user_permissions(granted);

-- 3) Activer RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 4) Policies
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view all user permissions" ON public.user_permissions;
CREATE POLICY "Owners can view all user permissions"
  ON public.user_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners can create user permissions" ON public.user_permissions;
CREATE POLICY "Owners can create user permissions"
  ON public.user_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners can update user permissions" ON public.user_permissions;
CREATE POLICY "Owners can update user permissions"
  ON public.user_permissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners can delete user permissions" ON public.user_permissions;
CREATE POLICY "Owners can delete user permissions"
  ON public.user_permissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = user_permissions.company_id
        AND r.slug = 'owner'
    )
  );

-- 5) Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER trigger_update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_permissions_updated_at();

-- ============================================================================
-- ✅ SCRIPT 1/2 TERMINÉ
-- Cliquez sur RUN (ou appuyez sur Cmd+Enter / Ctrl+Enter)
-- Attendez le message "Success"
-- Puis passez au SCRIPT 2/2
-- ============================================================================
