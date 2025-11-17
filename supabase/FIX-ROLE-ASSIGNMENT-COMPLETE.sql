-- ============================================
-- CORRECTION COMPLÈTE : ASSIGNATION DE RÔLES
-- ============================================
-- Ce script corrige tous les problèmes liés à l'assignation de rôles :
-- 1. Ajoute 'administrateur' à l'enum app_role
-- 2. Crée les politiques RLS nécessaires pour l'insertion
-- 3. Vérifie que tout fonctionne correctement
-- ============================================

-- ÉTAPE 1 : Ajouter "administrateur" à l'enum app_role
DO $$
BEGIN
  -- Essayer d'ajouter la valeur
  ALTER TYPE public.app_role ADD VALUE 'administrateur';
  RAISE NOTICE '✅ Valeur "administrateur" ajoutée à l''enum app_role';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️ La valeur "administrateur" existe déjà dans l''enum app_role';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erreur lors de l''ajout de "administrateur" : %', SQLERRM;
END $$;

-- ÉTAPE 2 : Créer une politique RLS pour permettre aux utilisateurs d'insérer leur propre rôle
-- Cette politique est CRITIQUE pour permettre l'inscription
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ÉTAPE 3 : Créer une politique pour permettre aux utilisateurs de mettre à jour leur propre rôle (optionnel)
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
CREATE POLICY "Users can update their own role"
  ON public.user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ÉTAPE 4 : Mettre à jour la politique SELECT pour inclure les administrateurs
DROP POLICY IF EXISTS "Administrators can view all roles" ON public.user_roles;
CREATE POLICY "Administrators can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'dirigeant'::app_role)
  );

-- ÉTAPE 5 : Vérifier que la table user_roles existe et a les bonnes colonnes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    RAISE EXCEPTION 'La table user_roles n''existe pas. Exécutez d''abord les migrations de base.';
  END IF;
  
  RAISE NOTICE '✅ Table user_roles vérifiée';
END $$;

-- ÉTAPE 6 : Vérifier que l'enum contient bien tous les rôles nécessaires
DO $$
DECLARE
  enum_values TEXT[];
BEGIN
  SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
  INTO enum_values
  FROM pg_enum
  WHERE enumtypid = 'public.app_role'::regtype;
  
  RAISE NOTICE '📋 Rôles disponibles dans app_role : %', array_to_string(enum_values, ', ');
  
  IF NOT ('administrateur' = ANY(enum_values)) THEN
    RAISE WARNING '⚠️ Le rôle "administrateur" n''est pas dans l''enum !';
  ELSE
    RAISE NOTICE '✅ Le rôle "administrateur" est présent dans l''enum';
  END IF;
END $$;

-- Message de confirmation final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ CORRECTION TERMINÉE !';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Vérifications effectuées :';
  RAISE NOTICE '   ✅ Enum app_role mis à jour';
  RAISE NOTICE '   ✅ Politique RLS INSERT créée';
  RAISE NOTICE '   ✅ Politique RLS UPDATE créée';
  RAISE NOTICE '   ✅ Politique RLS SELECT pour administrateurs créée';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Vous pouvez maintenant créer des comptes administrateur !';
  RAISE NOTICE '';
END $$;

