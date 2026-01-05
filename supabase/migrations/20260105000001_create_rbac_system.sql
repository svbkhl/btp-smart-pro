-- ============================================================================
-- MIGRATION: Système RBAC (Role-Based Access Control) Complet
-- Description: Création des tables roles, permissions, role_permissions, audit_logs
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- 1) TABLE: permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Clé unique de la permission
  key TEXT NOT NULL UNIQUE,
  
  -- Décomposition de la clé
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  
  -- Informations
  description TEXT,
  category TEXT NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT permissions_key_format CHECK (key ~ '^[a-z_]+\.[a-z_]+$'),
  CONSTRAINT permissions_resource_action_unique UNIQUE(resource, action)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);

-- Commentaires
COMMENT ON TABLE public.permissions IS 'Liste de toutes les permissions atomiques du système';
COMMENT ON COLUMN public.permissions.key IS 'Clé unique de la permission (ex: users.invite)';
COMMENT ON COLUMN public.permissions.category IS 'Catégorie pour UI: company, business, hr, communication';

-- ============================================================================
-- 2) TABLE: roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entreprise
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Informations du rôle
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Type
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Métadonnées visuelles
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'user',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT roles_company_slug_unique UNIQUE(company_id, slug),
  CONSTRAINT roles_company_name_unique UNIQUE(company_id, name),
  CONSTRAINT roles_slug_format CHECK (slug ~ '^[a-z_]+$')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON public.roles(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_slug ON public.roles(slug);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON public.roles(is_system);

-- Commentaires
COMMENT ON TABLE public.roles IS 'Rôles des utilisateurs par entreprise';
COMMENT ON COLUMN public.roles.slug IS 'Identifiant unique du rôle (ex: owner, admin, rh, employee)';
COMMENT ON COLUMN public.roles.is_system IS 'Rôle système (non supprimable)';
COMMENT ON COLUMN public.roles.is_default IS 'Rôle par défaut pour nouveaux employés';

-- ============================================================================
-- 3) TABLE: role_permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT role_permissions_unique UNIQUE(role_id, permission_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- Commentaires
COMMENT ON TABLE public.role_permissions IS 'Association entre rôles et permissions';

-- ============================================================================
-- 4) TABLE: audit_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexte
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  -- Détails
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- IP et User Agent
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT audit_logs_action_not_empty CHECK (action <> ''),
  CONSTRAINT audit_logs_resource_type_not_empty CHECK (resource_type <> '')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Commentaires
COMMENT ON TABLE public.audit_logs IS 'Journal d''audit des actions sensibles';
COMMENT ON COLUMN public.audit_logs.action IS 'Action effectuée (ex: user.role_changed)';
COMMENT ON COLUMN public.audit_logs.details IS 'Détails de l''action (JSON)';

-- ============================================================================
-- 5) MISE À JOUR: company_users (ajout role_id)
-- ============================================================================

-- Ajouter colonne role_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_users' 
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.company_users
    ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_company_users_role_id ON public.company_users(role_id);
    
    COMMENT ON COLUMN public.company_users.role_id IS 'Référence au rôle (remplace la colonne role TEXT)';
  END IF;
END $$;

-- ============================================================================
-- 6) MISE À JOUR: invitations (ajout role_id)
-- ============================================================================

-- Ajouter colonne role_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations' 
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.invitations
    ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_invitations_role_id ON public.invitations(role_id);
    
    COMMENT ON COLUMN public.invitations.role_id IS 'Référence au rôle attribué à l''invité';
  END IF;
END $$;

-- ============================================================================
-- 7) FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction: Récupérer les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid UUID, company_uuid UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  permissions_array TEXT[];
BEGIN
  -- Récupérer toutes les permissions de l'utilisateur
  SELECT ARRAY_AGG(DISTINCT p.key)
  INTO permissions_array
  FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE cu.user_id = user_uuid
  AND cu.company_id = company_uuid
  AND cu.status = 'active'
  AND r.company_id = company_uuid;
  
  RETURN COALESCE(permissions_array, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION public.get_user_permissions IS 'Retourne toutes les permissions d''un utilisateur dans une entreprise';

-- Fonction: Vérifier si un utilisateur a une permission
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_uuid UUID, 
  company_uuid UUID, 
  permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur a la permission
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = user_uuid
    AND cu.company_id = company_uuid
    AND cu.status = 'active'
    AND r.company_id = company_uuid
    AND p.key = permission_key
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.check_user_permission IS 'Vérifie si un utilisateur a une permission spécifique';

-- Fonction: Vérifier si un utilisateur est OWNER
CREATE OR REPLACE FUNCTION public.is_owner(user_uuid UUID, company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_owner_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = user_uuid
    AND cu.company_id = company_uuid
    AND cu.status = 'active'
    AND r.slug = 'owner'
  ) INTO is_owner_result;
  
  RETURN COALESCE(is_owner_result, false);
END;
$$;

COMMENT ON FUNCTION public.is_owner IS 'Vérifie si un utilisateur est OWNER d''une entreprise';

-- Fonction: Récupérer le rôle d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID, company_uuid UUID)
RETURNS TABLE (
  role_id UUID,
  role_slug TEXT,
  role_name TEXT,
  is_system BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.slug,
    r.name,
    r.is_system
  FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  WHERE cu.user_id = user_uuid
  AND cu.company_id = company_uuid
  AND cu.status = 'active';
END;
$$;

COMMENT ON FUNCTION public.get_user_role IS 'Retourne le rôle d''un utilisateur dans une entreprise';

-- ============================================================================
-- 8) TRIGGER: Mise à jour automatique de updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger sur roles
DROP TRIGGER IF EXISTS trigger_roles_updated_at ON public.roles;
CREATE TRIGGER trigger_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
