-- ============================================================================
-- SEED: Permissions par défaut du système
-- Description: Insertion de toutes les permissions atomiques
-- Date: 2026-01-05
-- ============================================================================

-- Nettoyer les permissions existantes (seulement en développement)
-- TRUNCATE TABLE public.permissions CASCADE;

-- ============================================================================
-- PERMISSIONS: COMPANY (Gestion entreprise)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('company.read', 'company', 'read', 'Voir les informations de l''entreprise', 'company'),
('company.update', 'company', 'update', 'Modifier les informations de l''entreprise', 'company'),
('company.delete', 'company', 'delete', 'Supprimer l''entreprise', 'company'),
('company.settings', 'company', 'settings', 'Modifier les paramètres critiques', 'company')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: USERS (Gestion utilisateurs)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('users.read', 'users', 'read', 'Voir la liste des utilisateurs', 'users'),
('users.invite', 'users', 'invite', 'Inviter de nouveaux utilisateurs', 'users'),
('users.update', 'users', 'update', 'Modifier les informations des utilisateurs', 'users'),
('users.delete', 'users', 'delete', 'Supprimer des utilisateurs', 'users'),
('users.update_role', 'users', 'update_role', 'Modifier les rôles des utilisateurs', 'users')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: ROLES (Gestion rôles)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('roles.read', 'roles', 'read', 'Voir la liste des rôles', 'users'),
('roles.create', 'roles', 'create', 'Créer de nouveaux rôles', 'users'),
('roles.update', 'roles', 'update', 'Modifier les rôles existants', 'users'),
('roles.delete', 'roles', 'delete', 'Supprimer des rôles', 'users')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: CLIENTS (Gestion clients)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('clients.read', 'clients', 'read', 'Voir la liste des clients', 'business'),
('clients.create', 'clients', 'create', 'Créer de nouveaux clients', 'business'),
('clients.update', 'clients', 'update', 'Modifier les informations des clients', 'business'),
('clients.delete', 'clients', 'delete', 'Supprimer des clients', 'business')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: QUOTES (Gestion devis)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('quotes.read', 'quotes', 'read', 'Voir la liste des devis', 'business'),
('quotes.create', 'quotes', 'create', 'Créer de nouveaux devis', 'business'),
('quotes.update', 'quotes', 'update', 'Modifier les devis existants', 'business'),
('quotes.delete', 'quotes', 'delete', 'Supprimer des devis', 'business'),
('quotes.send', 'quotes', 'send', 'Envoyer des devis aux clients', 'business')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: INVOICES (Gestion factures)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('invoices.read', 'invoices', 'read', 'Voir la liste des factures', 'business'),
('invoices.create', 'invoices', 'create', 'Créer de nouvelles factures', 'business'),
('invoices.update', 'invoices', 'update', 'Modifier les factures existantes', 'business'),
('invoices.delete', 'invoices', 'delete', 'Supprimer des factures', 'business'),
('invoices.send', 'invoices', 'send', 'Envoyer des factures aux clients', 'business')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: PAYMENTS (Gestion paiements)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('payments.read', 'payments', 'read', 'Voir la liste des paiements', 'business'),
('payments.create', 'payments', 'create', 'Créer de nouveaux paiements', 'business'),
('payments.refund', 'payments', 'refund', 'Effectuer des remboursements', 'business')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: PLANNING (Gestion planning)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('planning.read', 'planning', 'read', 'Voir le planning', 'hr'),
('planning.create', 'planning', 'create', 'Créer des événements au planning', 'hr'),
('planning.update', 'planning', 'update', 'Modifier le planning', 'hr'),
('planning.delete', 'planning', 'delete', 'Supprimer des événements du planning', 'hr')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: LEAVES (Gestion congés)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('leaves.read', 'leaves', 'read', 'Voir les demandes de congés', 'hr'),
('leaves.create', 'leaves', 'create', 'Créer une demande de congé', 'hr'),
('leaves.update', 'leaves', 'update', 'Modifier une demande de congé', 'hr'),
('leaves.approve', 'leaves', 'approve', 'Approuver/refuser des congés', 'hr')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: MESSAGES (Communication)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('messages.read', 'messages', 'read', 'Lire les messages', 'communication'),
('messages.send', 'messages', 'send', 'Envoyer des messages', 'communication'),
('messages.delete', 'messages', 'delete', 'Supprimer des messages', 'communication')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: AUDIT (Audit logs)
-- ============================================================================

INSERT INTO public.permissions (key, resource, action, description, category) VALUES
('audit.read', 'audit', 'read', 'Consulter les logs d''audit', 'company')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Afficher toutes les permissions créées
DO $$
DECLARE
  permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permission_count FROM public.permissions;
  RAISE NOTICE '✅ % permissions créées avec succès', permission_count;
END $$;

-- ============================================================================
-- FIN DU SEED
-- ============================================================================
