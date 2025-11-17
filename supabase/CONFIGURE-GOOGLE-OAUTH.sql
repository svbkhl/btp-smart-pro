-- Script SQL pour configurer l'assignation automatique de rôle après connexion OAuth
-- Ce script crée un trigger qui assigne automatiquement le rôle "dirigeant" 
-- aux nouveaux utilisateurs qui se connectent via OAuth (Google, Apple, etc.)

-- Fonction pour assigner un rôle par défaut aux nouveaux utilisateurs
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
       -- Assigner le rôle "administrateur" par défaut pour les nouveaux utilisateurs
       -- (vous pouvez changer "administrateur" en "dirigeant" ou "salarie" si vous préférez)
       INSERT INTO public.user_roles (user_id, role)
       VALUES (NEW.id, 'administrateur')
       ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger qui s'exécute après la création d'un utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();

-- Vérification : Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger créé avec succès !';
         RAISE NOTICE 'Les nouveaux utilisateurs (y compris OAuth Google et Apple) recevront automatiquement le rôle "administrateur"';
END $$;

