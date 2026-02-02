-- ============================================================================
-- MIGRATION COMPLÈTE : Système de permissions personnalisées par employé
-- COPIEZ ET COLLEZ CE SCRIPT COMPLET DANS SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- PARTIE 1 : Créer la table user_permissions
-- ============================================================================

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

-- Index
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company_id ON public.user_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted ON public.user_permissions(granted);

COMMENT ON TABLE public.user_permissions IS 'Permissions individuelles personnalisées par employé';
COMMENT ON COLUMN public.user_permissions.granted IS 'true = accordée, false = révoquée';

-- ============================================================================
-- PARTIE 2 : RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- PARTIE 3 : Trigger pour updated_at
-- ============================================================================

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
-- PARTIE 4 : Insérer les permissions de base
-- ============================================================================

-- Permissions basées sur les sections de navigation principale
INSERT INTO public.permissions (key, resource, action, category, description)
VALUES
  ('dashboard.access', 'dashboard', 'access', 'navigation', 'Accès au tableau de bord général'),
  ('clients.access', 'clients', 'access', 'navigation', 'Voir et gérer les clients'),
  ('projects.access', 'projects', 'access', 'navigation', 'Voir et gérer les chantiers'),
  ('planning.access', 'planning', 'access', 'navigation', 'Accès au calendrier et planning personnel'),
  ('employees.access', 'employees', 'access', 'navigation', 'Voir et gérer les employés'),
  ('ai.access', 'ai', 'access', 'navigation', 'Accès aux fonctionnalités d''intelligence artificielle'),
  ('billing.access', 'billing', 'access', 'navigation', 'Gérer les devis et factures'),
  ('messaging.access', 'messaging', 'access', 'navigation', 'Accès à la messagerie interne')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PARTIE 5 : Mettre à jour la fonction get_user_permissions
-- ============================================================================

-- Drop existing function first (to allow changing return type)
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_permissions_with_custom(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_user_permissions(
  user_uuid UUID,
  company_uuid UUID
)
RETURNS TABLE(permission_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
  role_perms AS (
    SELECT DISTINCT p.key
    FROM company_users cu
    JOIN roles r ON r.id = cu.role_id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = user_uuid
      AND cu.company_id = company_uuid
  ),
  custom_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = true
  ),
  revoked_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = false
  )
  SELECT key FROM (
    SELECT key FROM role_perms
    UNION
    SELECT key FROM custom_perms
  ) combined_perms
  WHERE key NOT IN (SELECT key FROM revoked_perms);
END;
$$;

-- ============================================================================
-- PARTIE 6 : Vérification finale
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  perm_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_permissions'
  ) INTO table_exists;
  
  SELECT COUNT(*) INTO perm_count FROM public.permissions;
  
  IF table_exists THEN
    RAISE NOTICE '✅ Table user_permissions créée avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur : La table user_permissions n existe pas';
  END IF;
  
  RAISE NOTICE '✅ Total de % permissions dans la base', perm_count;
  RAISE NOTICE '🎉 Migration terminée ! Le système de permissions est prêt.';
END $$;

-- ============================================================================
-- ✅ MIGRATION TERMINÉE
-- Appuyez sur RUN ou Cmd+Enter / Ctrl+Enter
-- Vous devriez voir :
--   ✅ Table user_permissions créée avec succès
--   ✅ Total de XX permissions dans la base
--   🎉 Migration terminée !
-- 
-- Ensuite, rafraîchissez votre application (F5)
-- ============================================================================
