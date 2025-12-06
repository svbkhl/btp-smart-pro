-- ============================================
-- SCRIPT POUR ACCORDER LE RÔLE ADMIN
-- À sabri.khalfallah6@gmail.com
-- ============================================
-- Ce script accorde tous les accès administrateur
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Trouver l'utilisateur et lui donner le rôle admin
DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'sabri.khalfallah6@gmail.com';
BEGIN
  -- Trouver l'ID de l'utilisateur par email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Utilisateur avec email % non trouvé dans auth.users. Vérifiez que le compte existe.', target_email;
  END IF;
  
  RAISE NOTICE '✅ Utilisateur trouvé: % (ID: %)', target_email, target_user_id;
  
  -- 2. S'assurer que l'enum app_role existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'member');
    RAISE NOTICE '✅ Type app_role créé';
  ELSE
    RAISE NOTICE 'ℹ️ Type app_role existe déjà';
  END IF;
  
  -- 3. S'assurer que la table user_roles existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    CREATE TABLE public.user_roles (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      role app_role NOT NULL DEFAULT 'member',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Créer les index
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
    
    -- Activer RLS
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ Table user_roles créée';
  ELSE
    RAISE NOTICE 'ℹ️ Table user_roles existe déjà';
  END IF;
  
  -- 4. Insérer ou mettre à jour le rôle admin (utilise SECURITY DEFINER pour bypass RLS)
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (target_user_id, 'admin'::app_role, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = 'admin'::app_role;
  
  RAISE NOTICE '✅ Rôle admin accordé avec succès à %', target_email;
  
  -- 5. Vérifier que le rôle a bien été assigné
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION '❌ Erreur: Le rôle admin n''a pas pu être assigné';
  END IF;
  
  RAISE NOTICE '✅ Vérification réussie: L''utilisateur % a maintenant le rôle admin', target_email;
  RAISE NOTICE '🎉 Tous les accès administrateur ont été accordés !';
  
END $$;

-- 6. Afficher les informations de l'utilisateur (vérification finale)
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  ur.role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ ADMINISTRATEUR'
    ELSE '❌ MEMBRE'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com';

-- 7. Vérifier les permissions RLS
DO $$
BEGIN
  -- Vérifier que les policies existent
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
  ) THEN
    RAISE NOTICE '⚠️ Aucune policy RLS trouvée pour user_roles.';
    RAISE NOTICE '⚠️ Exécutez FIX-RLS-CREATE-COMPANIES.sql pour créer les policies RLS.';
  ELSE
    RAISE NOTICE '✅ Policies RLS trouvées pour user_roles';
  END IF;
END $$;

-- 8. Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT TERMINÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'L''utilisateur sabri.khalfallah6@gmail.com';
  RAISE NOTICE 'a maintenant tous les accès administrateur.';
  RAISE NOTICE '';
  RAISE NOTICE 'Accès accordés :';
  RAISE NOTICE '  ✅ Gestion des entreprises';
  RAISE NOTICE '  ✅ Gestion des utilisateurs';
  RAISE NOTICE '  ✅ Gestion des rôles et permissions';
  RAISE NOTICE '  ✅ Configuration des entreprises';
  RAISE NOTICE '  ✅ Mode démo';
  RAISE NOTICE '  ✅ Demandes de contact';
  RAISE NOTICE '';
  RAISE NOTICE 'Rafraîchissez votre application pour voir';
  RAISE NOTICE 'tous les onglets administrateur.';
  RAISE NOTICE '========================================';
END $$;

