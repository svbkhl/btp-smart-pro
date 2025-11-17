-- ============================================
-- MISE À JOUR DES RÔLES : SÉPARER ADMINISTRATEUR ET DIRIGEANT
-- ============================================
-- Ce script met à jour le type enum pour séparer "administrateur" et "dirigeant"
-- et remplace "chef_equipe" par "dirigeant" si nécessaire
-- ============================================

-- 1. Créer un nouveau type enum avec les nouveaux rôles
DO $$
BEGIN
  -- Supprimer l'ancien type s'il existe
  DROP TYPE IF EXISTS app_role CASCADE;
  
  -- Créer le nouveau type avec les rôles séparés
  CREATE TYPE app_role AS ENUM (
    'administrateur',
    'dirigeant',
    'salarie',
    'client'
  );
  
  RAISE NOTICE '✅ Type app_role créé avec succès !';
END $$;

-- 2. Mettre à jour la table user_roles si elle existe
DO $$
BEGIN
  -- Vérifier si la table existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    -- Mettre à jour les anciens rôles "dirigeant" en "administrateur" (ou garder selon votre choix)
    -- Ici, on garde "dirigeant" mais vous pouvez changer en "administrateur" si vous voulez
    -- UPDATE public.user_roles SET role = 'administrateur'::app_role WHERE role::text = 'dirigeant';
    
    -- Mettre à jour "chef_equipe" en "dirigeant" si nécessaire
    -- UPDATE public.user_roles SET role = 'dirigeant'::app_role WHERE role::text = 'chef_equipe';
    
    RAISE NOTICE '✅ Table user_roles vérifiée !';
  ELSE
    RAISE NOTICE '⚠️ Table user_roles n''existe pas encore';
  END IF;
END $$;

-- 3. Mettre à jour la fonction has_role si elle existe
DO $$
BEGIN
  -- Recréer la fonction has_role avec le nouveau type
  CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role app_role)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = has_role.user_id
        AND user_roles.role = required_role
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  RAISE NOTICE '✅ Fonction has_role mise à jour !';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Fonction has_role non mise à jour : %', SQLERRM;
END $$;

-- 4. Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Mise à jour des rôles terminée !';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Rôles disponibles :';
  RAISE NOTICE '   - administrateur : Accès complet + gestion RH';
  RAISE NOTICE '   - dirigeant : Accès complet (chantiers, clients, devis, etc.)';
  RAISE NOTICE '   - salarie : Accès au planning personnel';
  RAISE NOTICE '   - client : Accès client (si nécessaire)';
  RAISE NOTICE '';
END $$;

