-- =====================================================
-- FIX : Mettre à jour la contrainte CHECK pour accepter 'owner'
-- =====================================================
-- Ce script modifie la contrainte company_invites_role_check
-- pour permettre l'invitation de dirigeants (owner)
-- =====================================================

DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'company_invites' 
    AND constraint_name = 'company_invites_role_check'
  ) THEN
    ALTER TABLE public.company_invites 
    DROP CONSTRAINT company_invites_role_check;
    
    RAISE NOTICE '✅ Ancienne contrainte company_invites_role_check supprimée';
  ELSE
    RAISE NOTICE 'ℹ️ La contrainte company_invites_role_check n''existe pas';
  END IF;
END $$;

-- Ajouter la nouvelle contrainte avec 'owner' inclus
ALTER TABLE public.company_invites 
ADD CONSTRAINT company_invites_role_check 
CHECK (role IN ('owner', 'admin', 'member'));

-- Vérification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Contrainte mise à jour avec succès !';
  RAISE NOTICE '   Les rôles acceptés sont maintenant: owner, admin, member';
  RAISE NOTICE '';
END $$;

-- Vérifier que la contrainte est bien créée
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
AND table_name = 'company_invites'
AND constraint_name = 'company_invites_role_check';
