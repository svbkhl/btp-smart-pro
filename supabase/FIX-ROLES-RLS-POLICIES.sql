-- ============================================================================
-- CORRECTION : POLITIQUES RLS POUR LA TABLE ROLES
-- ============================================================================
-- Ce script ajoute les politiques RLS manquantes pour la table roles
-- afin que les utilisateurs puissent lire les rôles de leur entreprise
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Vérifier que RLS est activé sur la table roles
-- ============================================================================

DO $$
BEGIN
  -- Activer RLS sur roles si ce n'est pas déjà fait
  ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ RLS activé sur la table roles';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erreur lors de l''activation de RLS : %', SQLERRM;
END $$;

-- ============================================================================
-- ÉTAPE 2 : Supprimer les anciennes politiques si elles existent
-- ============================================================================

DROP POLICY IF EXISTS "Users can view roles of their company" ON public.roles;
DROP POLICY IF EXISTS "Company members can view their company roles" ON public.roles;
DROP POLICY IF EXISTS "All authenticated users can view roles" ON public.roles;

-- ============================================================================
-- ÉTAPE 3 : Créer une politique permissive pour lire les rôles
-- ============================================================================
-- Tous les utilisateurs authentifiés peuvent voir les rôles de leur entreprise
-- (basé sur la relation company_users)

CREATE POLICY "Users can view roles of their company"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (
    -- L'utilisateur peut voir les rôles de son entreprise
    company_id IN (
      SELECT company_id 
      FROM public.company_users 
      WHERE user_id = auth.uid()
    )
  );

RAISE NOTICE '✅ Politique "Users can view roles of their company" créée';

-- ============================================================================
-- ÉTAPE 4 : Créer des politiques pour les autres opérations (INSERT, UPDATE, DELETE)
-- ============================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Only owners can create roles" ON public.roles;
DROP POLICY IF EXISTS "Only owners can update non-system roles" ON public.roles;
DROP POLICY IF EXISTS "Only owners can delete non-system roles" ON public.roles;

-- INSERT : Seuls les owners peuvent créer de nouveaux rôles
CREATE POLICY "Only owners can create roles"
  ON public.roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Vérifier que l'utilisateur est owner de cette entreprise
    company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND r.slug = 'owner'
    )
  );

RAISE NOTICE '✅ Politique "Only owners can create roles" créée';

-- UPDATE : Seuls les owners peuvent modifier les rôles non-système
CREATE POLICY "Only owners can update non-system roles"
  ON public.roles
  FOR UPDATE
  TO authenticated
  USING (
    -- L'utilisateur doit être owner de cette entreprise
    company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND r.slug = 'owner'
    )
    -- Et le rôle ne doit pas être un rôle système
    AND is_system = false
  )
  WITH CHECK (
    -- Vérifications identiques pour WITH CHECK
    company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND r.slug = 'owner'
    )
    AND is_system = false
  );

RAISE NOTICE '✅ Politique "Only owners can update non-system roles" créée';

-- DELETE : Seuls les owners peuvent supprimer les rôles non-système
CREATE POLICY "Only owners can delete non-system roles"
  ON public.roles
  FOR DELETE
  TO authenticated
  USING (
    -- L'utilisateur doit être owner de cette entreprise
    company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND r.slug = 'owner'
    )
    -- Et le rôle ne doit pas être un rôle système
    AND is_system = false
  );

RAISE NOTICE '✅ Politique "Only owners can delete non-system roles" créée';

-- ============================================================================
-- ÉTAPE 5 : Vérifier les politiques créées
-- ============================================================================

DO $$
DECLARE
  v_policy_count INT;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'roles';
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 VÉRIFICATION FINALE :';
  RAISE NOTICE '   ✅ % politique(s) RLS créée(s) pour la table roles', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '✨ Configuration RLS terminée avec succès !';
END $$;

-- Afficher toutes les politiques
SELECT 
  policyname as "Politique",
  cmd as "Opération",
  CASE
    WHEN cmd = 'SELECT' THEN '👀 Lecture'
    WHEN cmd = 'INSERT' THEN '➕ Création'
    WHEN cmd = 'UPDATE' THEN '✏️ Modification'
    WHEN cmd = 'DELETE' THEN '🗑️ Suppression'
    ELSE cmd::TEXT
  END as "Type"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'roles'
ORDER BY cmd;
