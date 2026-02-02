-- ============================================================================
-- MIGRATION: Insérer les permissions de base pour le système
-- Description: Ajoute toutes les permissions nécessaires pour la gestion granulaire
-- Date: 2026-02-01
-- ============================================================================

-- Insérer les permissions si elles n'existent pas déjà
INSERT INTO public.permissions (key, resource, action, category, description)
VALUES
  -- Clients
  ('clients.read', 'clients', 'read', 'business', 'Voir les clients'),
  ('clients.create', 'clients', 'create', 'business', 'Créer des clients'),
  ('clients.update', 'clients', 'update', 'business', 'Modifier les clients'),
  ('clients.delete', 'clients', 'delete', 'business', 'Supprimer les clients'),
  
  -- Projets
  ('projects.read', 'projects', 'read', 'business', 'Voir les projets'),
  ('projects.create', 'projects', 'create', 'business', 'Créer des projets'),
  ('projects.update', 'projects', 'update', 'business', 'Modifier les projets'),
  ('projects.delete', 'projects', 'delete', 'business', 'Supprimer les projets'),
  
  -- Devis (Quotes)
  ('quotes.read', 'quotes', 'read', 'business', 'Voir les devis'),
  ('quotes.create', 'quotes', 'create', 'business', 'Créer des devis'),
  ('quotes.update', 'quotes', 'update', 'business', 'Modifier les devis'),
  ('quotes.delete', 'quotes', 'delete', 'business', 'Supprimer les devis'),
  ('quotes.send', 'quotes', 'send', 'business', 'Envoyer des devis'),
  
  -- Factures (Invoices)
  ('invoices.read', 'invoices', 'read', 'business', 'Voir les factures'),
  ('invoices.create', 'invoices', 'create', 'business', 'Créer des factures'),
  ('invoices.update', 'invoices', 'update', 'business', 'Modifier les factures'),
  ('invoices.delete', 'invoices', 'delete', 'business', 'Supprimer les factures'),
  ('invoices.send', 'invoices', 'send', 'business', 'Envoyer les factures'),
  
  -- Utilisateurs / Employés
  ('users.read', 'users', 'read', 'hr', 'Voir les employés'),
  ('users.create', 'users', 'create', 'hr', 'Créer des employés'),
  ('users.update', 'users', 'update', 'hr', 'Modifier les employés'),
  ('users.delete', 'users', 'delete', 'hr', 'Supprimer les employés'),
  ('users.invite', 'users', 'invite', 'hr', 'Inviter des employés'),
  ('users.update_role', 'users', 'update_role', 'hr', 'Changer le rôle des employés'),
  
  -- Paramètres entreprise
  ('company.settings', 'company', 'settings', 'company', 'Gérer les paramètres de l''entreprise'),
  ('company.update', 'company', 'update', 'company', 'Modifier les informations de l''entreprise'),
  
  -- Rôles et permissions
  ('roles.read', 'roles', 'read', 'company', 'Voir les rôles'),
  ('roles.create', 'roles', 'create', 'company', 'Créer des rôles'),
  ('roles.update', 'roles', 'update', 'company', 'Modifier les rôles'),
  ('roles.delete', 'roles', 'delete', 'company', 'Supprimer les rôles'),
  ('permissions.manage', 'permissions', 'manage', 'company', 'Gérer les permissions'),
  
  -- Messagerie
  ('messages.read', 'messages', 'read', 'communication', 'Lire les messages'),
  ('messages.send', 'messages', 'send', 'communication', 'Envoyer des messages'),
  
  -- Calendrier / Planning
  ('calendar.read', 'calendar', 'read', 'business', 'Voir le calendrier'),
  ('calendar.create', 'calendar', 'create', 'business', 'Créer des événements'),
  ('calendar.update', 'calendar', 'update', 'business', 'Modifier des événements'),
  ('calendar.delete', 'calendar', 'delete', 'business', 'Supprimer des événements')
ON CONFLICT (key) DO NOTHING;

-- Vérifier le nombre de permissions insérées
DO $$
DECLARE
  perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM public.permissions;
  RAISE NOTICE '✅ Total de % permissions dans la base de données', perm_count;
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
