-- ============================================
-- AJOUTER LE RÔLE "administrateur" À L'ENUM app_role
-- ============================================
-- Ce script ajoute le rôle "administrateur" à l'enum app_role
-- et ajoute une politique RLS pour permettre aux utilisateurs
-- d'insérer leur propre rôle lors de l'inscription
-- ============================================

-- Ajouter "administrateur" à l'enum app_role
-- Note: ALTER TYPE ADD VALUE ne supporte pas IF NOT EXISTS dans certaines versions de PostgreSQL
-- On utilise un DO block pour gérer l'erreur si la valeur existe déjà
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

-- Ajouter une politique RLS pour permettre aux utilisateurs d'insérer leur propre rôle
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ajouter une politique pour permettre aux administrateurs de voir tous les rôles
DROP POLICY IF EXISTS "Administrators can view all roles" ON public.user_roles;
CREATE POLICY "Administrators can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'dirigeant'::app_role)
  );

-- Mettre à jour la fonction has_role pour supporter administrateur
-- (pas nécessaire, elle fonctionne déjà avec tous les rôles)

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Rôle "administrateur" ajouté à l''enum app_role';
  RAISE NOTICE '✅ Politique RLS ajoutée pour permettre l''insertion de rôles lors de l''inscription';
END $$;

