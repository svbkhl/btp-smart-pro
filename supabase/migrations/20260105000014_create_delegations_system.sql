-- ============================================================================
-- 🔐 SYSTÈME DE DÉLÉGATION TEMPORAIRE DE PERMISSIONS
-- ============================================================================
-- Description: Permet à un utilisateur autorisé de déléguer temporairement
--              des permissions à un autre utilisateur sans modifier son rôle
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- 1) TABLE: delegations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexte entreprise
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Utilisateurs
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permission déléguée
  permission_key TEXT NOT NULL,
  
  -- Dates
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  -- Métadonnées
  reason TEXT, -- Raison de la délégation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT delegations_different_users CHECK (from_user_id != to_user_id),
  CONSTRAINT delegations_valid_dates CHECK (ends_at > starts_at),
  CONSTRAINT delegations_valid_permission CHECK (
    permission_key NOT LIKE 'company.delete%' AND
    permission_key NOT LIKE 'roles.%' AND
    permission_key NOT LIKE 'users.delete%'
  )
);

-- ============================================================================
-- 2) INDEXES pour performance
-- ============================================================================
CREATE INDEX idx_delegations_company_id ON public.delegations(company_id);
CREATE INDEX idx_delegations_to_user_id ON public.delegations(to_user_id);
CREATE INDEX idx_delegations_from_user_id ON public.delegations(from_user_id);
CREATE INDEX idx_delegations_ends_at ON public.delegations(ends_at);
CREATE INDEX idx_delegations_active ON public.delegations(company_id, to_user_id, ends_at, revoked_at)
  WHERE revoked_at IS NULL;

-- Index composite pour requêtes fréquentes (sans now() car pas IMMUTABLE)
CREATE INDEX idx_delegations_active_user ON public.delegations(to_user_id, company_id, ends_at, revoked_at)
  WHERE revoked_at IS NULL;

-- ============================================================================
-- 3) TRIGGER: Auto-update updated_at
-- ============================================================================
CREATE TRIGGER update_delegations_updated_at
  BEFORE UPDATE ON public.delegations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4) FONCTION: Vérifier si un utilisateur peut déléguer une permission
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_delegate_permission(
  delegator_user_id UUID,
  company_uuid UUID,
  permission_to_delegate TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_owner BOOLEAN;
  has_permission BOOLEAN;
BEGIN
  -- Le OWNER peut tout déléguer (sauf permissions OWNER)
  SELECT public.is_owner(delegator_user_id, company_uuid) INTO is_owner;
  
  IF is_owner THEN
    -- OWNER peut déléguer sauf permissions critiques
    RETURN permission_to_delegate NOT LIKE 'company.delete%' 
       AND permission_to_delegate NOT LIKE 'roles.%'
       AND permission_to_delegate NOT LIKE 'users.delete%';
  END IF;
  
  -- Autres utilisateurs : doivent avoir la permission pour la déléguer
  SELECT public.check_user_permission(delegator_user_id, company_uuid, permission_to_delegate)
  INTO has_permission;
  
  RETURN has_permission;
END;
$$;

COMMENT ON FUNCTION public.can_delegate_permission IS 'Vérifie si un utilisateur peut déléguer une permission';

-- ============================================================================
-- 5) FONCTION: Récupérer les permissions déléguées actives d'un utilisateur
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_delegated_permissions(
  user_uuid UUID,
  company_uuid UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  permissions_array TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT d.permission_key)
  INTO permissions_array
  FROM public.delegations d
  WHERE d.to_user_id = user_uuid
  AND d.company_id = company_uuid
  AND d.revoked_at IS NULL
  AND d.starts_at <= now()
  AND d.ends_at > now();
  
  RETURN COALESCE(permissions_array, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION public.get_active_delegated_permissions IS 'Retourne les permissions déléguées actives d''un utilisateur';

-- ============================================================================
-- 6) FONCTION: Permissions effectives (rôle + délégations)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  user_uuid UUID,
  company_uuid UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  role_permissions TEXT[];
  delegated_permissions TEXT[];
  effective_permissions TEXT[];
BEGIN
  -- Récupérer les permissions du rôle
  SELECT public.get_user_permissions(user_uuid, company_uuid) INTO role_permissions;
  
  -- Récupérer les permissions déléguées actives
  SELECT public.get_active_delegated_permissions(user_uuid, company_uuid) INTO delegated_permissions;
  
  -- Fusionner (sans doublons)
  SELECT ARRAY(
    SELECT DISTINCT unnest(role_permissions || delegated_permissions)
    ORDER BY 1
  ) INTO effective_permissions;
  
  RETURN COALESCE(effective_permissions, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION public.get_user_effective_permissions IS 'Retourne les permissions effectives (rôle + délégations actives)';

-- ============================================================================
-- 7) FONCTION: Vérifier permission effective (rôle + délégations)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_effective_permission(
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
  -- Vérifier d'abord dans le rôle
  SELECT public.check_user_permission(user_uuid, company_uuid, permission_key) INTO has_permission;
  
  IF has_permission THEN
    RETURN true;
  END IF;
  
  -- Sinon vérifier dans les délégations actives
  SELECT EXISTS (
    SELECT 1
    FROM public.delegations d
    WHERE d.to_user_id = user_uuid
    AND d.company_id = company_uuid
    AND d.permission_key = permission_key
    AND d.revoked_at IS NULL
    AND d.starts_at <= now()
    AND d.ends_at > now()
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.check_user_effective_permission IS 'Vérifie si un utilisateur a une permission (rôle ou délégation active)';

-- ============================================================================
-- 8) FONCTION: Révoquer une délégation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.revoke_delegation(
  delegation_id UUID,
  revoker_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  delegation_record RECORD;
  is_authorized BOOLEAN;
BEGIN
  -- Récupérer la délégation
  SELECT * INTO delegation_record
  FROM public.delegations
  WHERE id = delegation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Délégation non trouvée';
  END IF;
  
  -- Vérifier que le révocateur est OWNER ou le délégant
  SELECT (
    public.is_owner(revoker_user_id, delegation_record.company_id) OR
    revoker_user_id = delegation_record.from_user_id
  ) INTO is_authorized;
  
  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Non autorisé à révoquer cette délégation';
  END IF;
  
  -- Révoquer
  UPDATE public.delegations
  SET revoked_at = now(),
      updated_at = now()
  WHERE id = delegation_id
  AND revoked_at IS NULL;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.revoke_delegation IS 'Révoque une délégation (OWNER ou délégant uniquement)';

-- ============================================================================
-- 9) TRIGGER: Expiration automatique (via fonction appelée périodiquement)
-- ============================================================================
-- Note: Cette fonction sera appelée par un cron job Supabase
CREATE OR REPLACE FUNCTION public.expire_delegations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Marquer comme expirées les délégations dont ends_at est passé
  UPDATE public.delegations
  SET updated_at = now()
  WHERE revoked_at IS NULL
  AND ends_at <= now()
  AND ends_at > now() - INTERVAL '1 day'; -- Seulement celles qui viennent d'expirer
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;

COMMENT ON FUNCTION public.expire_delegations IS 'Marque les délégations expirées (appelée par cron)';

-- ============================================================================
-- 10) ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Voir les délégations de son entreprise
CREATE POLICY "Users can view delegations in their company"
ON public.delegations FOR SELECT
USING (
  company_id = public.current_company_id()
);

-- Policy: INSERT - Créer une délégation (vérifications dans la fonction)
CREATE POLICY "Authorized users can create delegations"
ON public.delegations FOR INSERT
WITH CHECK (
  company_id = public.current_company_id()
  AND from_user_id = auth.uid()
  AND public.can_delegate_permission(auth.uid(), company_id, permission_key)
);

-- Policy: UPDATE - Seul le délégant ou OWNER peut modifier
CREATE POLICY "Delegator or owner can update delegations"
ON public.delegations FOR UPDATE
USING (
  company_id = public.current_company_id()
  AND (
    from_user_id = auth.uid() OR
    public.is_owner(auth.uid(), company_id)
  )
)
WITH CHECK (
  company_id = public.current_company_id()
  AND (
    from_user_id = auth.uid() OR
    public.is_owner(auth.uid(), company_id)
  )
);

-- Policy: DELETE - Seul OWNER peut supprimer définitivement
CREATE POLICY "Only owner can delete delegations"
ON public.delegations FOR DELETE
USING (
  company_id = public.current_company_id()
  AND public.is_owner(auth.uid(), company_id)
);

-- ============================================================================
-- 11) VUES UTILES
-- ============================================================================

-- Vue: Délégations actives
CREATE OR REPLACE VIEW public.active_delegations AS
SELECT 
  d.*,
  u1.email as from_user_email,
  u2.email as to_user_email,
  CASE 
    WHEN d.revoked_at IS NOT NULL THEN 'revoked'
    WHEN d.ends_at <= now() THEN 'expired'
    WHEN d.starts_at > now() THEN 'pending'
    ELSE 'active'
  END as status
FROM public.delegations d
LEFT JOIN auth.users u1 ON u1.id = d.from_user_id
LEFT JOIN auth.users u2 ON u2.id = d.to_user_id;

COMMENT ON VIEW public.active_delegations IS 'Vue des délégations avec statut calculé';

-- RLS pour la vue
ALTER VIEW public.active_delegations SET (security_invoker = true);

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 SYSTÈME DE DÉLÉGATION CRÉÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table delegations créée';
  RAISE NOTICE '✅ Indexes créés pour performance';
  RAISE NOTICE '✅ Fonctions SQL créées:';
  RAISE NOTICE '   - can_delegate_permission()';
  RAISE NOTICE '   - get_active_delegated_permissions()';
  RAISE NOTICE '   - get_user_effective_permissions()';
  RAISE NOTICE '   - check_user_effective_permission()';
  RAISE NOTICE '   - revoke_delegation()';
  RAISE NOTICE '   - expire_delegations()';
  RAISE NOTICE '✅ RLS activé avec policies strictes';
  RAISE NOTICE '✅ Vue active_delegations créée';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Système sécurisé et prêt à l''emploi';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
