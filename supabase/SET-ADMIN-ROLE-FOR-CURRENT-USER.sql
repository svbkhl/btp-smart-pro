-- =====================================================
-- DÉFINIR LE RÔLE ADMINISTRATEUR POUR L'UTILISATEUR ACTUEL
-- =====================================================
-- Ce script ajoute le rôle administrateur dans user_roles
-- pour l'utilisateur actuellement connecté
-- =====================================================

-- Vérifier si la table user_roles existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    RAISE NOTICE '⚠️ Table user_roles n''existe pas. Création...';
    
    -- Créer le type enum app_role s'il n'existe pas
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
      CREATE TYPE public.app_role AS ENUM ('administrateur', 'dirigeant', 'salarie', 'client');
    END IF;
    
    -- Créer la table user_roles
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      role app_role NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id, role)
    );
    
    -- Activer RLS
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    -- Créer les policies de base
    DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles FOR SELECT
      USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
    CREATE POLICY "Users can insert their own role"
      ON public.user_roles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Table user_roles créée';
  ELSE
    RAISE NOTICE '✅ Table user_roles existe déjà';
  END IF;
END $$;

-- Vérifier si le type app_role existe et contient 'administrateur'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('administrateur', 'dirigeant', 'salarie', 'client');
    RAISE NOTICE '✅ Type app_role créé';
  END IF;
  
  -- Ajouter 'administrateur' à l'enum s'il n'existe pas
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrateur';
    RAISE NOTICE '✅ Valeur administrateur ajoutée à app_role';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️ Valeur administrateur existe déjà dans app_role';
  END;
END $$;

-- Ajouter le rôle administrateur pour tous les utilisateurs (pour les tests)
-- Ou pour un utilisateur spécifique si vous préférez
-- Remplacez 'USER_EMAIL@example.com' par l'email de l'utilisateur de test
DO $$
DECLARE
  target_user_id UUID;
  user_email TEXT := NULL; -- Mettez l'email ici pour cibler un utilisateur spécifique, ou NULL pour tous
BEGIN
  -- Si aucun email spécifié, appliquer à tous les utilisateurs
  IF user_email IS NULL THEN
    -- Ajouter le rôle administrateur à tous les utilisateurs qui n'ont pas déjà un rôle
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'administrateur'::app_role
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.users.id
    )
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Rôle administrateur ajouté à tous les utilisateurs sans rôle';
  ELSE
    -- Trouver l'utilisateur par email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
      RAISE NOTICE '⚠️ Utilisateur avec email % non trouvé', user_email;
    ELSE
      -- Ajouter le rôle administrateur à cet utilisateur
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target_user_id, 'administrateur'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE '✅ Rôle administrateur ajouté à l''utilisateur %', user_email;
    END IF;
  END IF;
END $$;

-- Vérifier les rôles actuels
SELECT 
  '📋 Rôles utilisateurs actuels' as status,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.email, ur.role;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Script terminé !';
  RAISE NOTICE '';
  RAISE NOTICE 'ℹ️ Pour ajouter le rôle administrateur à un utilisateur spécifique :';
  RAISE NOTICE '   1. Modifiez la variable user_email dans le script ci-dessus';
  RAISE NOTICE '   2. Ou exécutez manuellement :';
  RAISE NOTICE '      INSERT INTO public.user_roles (user_id, role)';
  RAISE NOTICE '      SELECT id, ''administrateur''::app_role FROM auth.users WHERE email = ''VOTRE_EMAIL@example.com''';
  RAISE NOTICE '      ON CONFLICT (user_id, role) DO NOTHING;';
  RAISE NOTICE '';
END $$;
