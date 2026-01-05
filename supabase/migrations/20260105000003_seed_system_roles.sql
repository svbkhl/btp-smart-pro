-- ============================================================================
-- SEED: Rôles système par défaut pour chaque entreprise
-- Description: Créer les 4 rôles système (OWNER, ADMIN, RH, EMPLOYEE) avec leurs permissions
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- FONCTION: Créer les rôles système pour une entreprise
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_system_roles_for_company(company_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role_owner_id UUID;
  role_admin_id UUID;
  role_rh_id UUID;
  role_employee_id UUID;
  
  -- Permissions IDs
  perm_company_read UUID;
  perm_company_update UUID;
  perm_company_delete UUID;
  perm_company_settings UUID;
  perm_users_read UUID;
  perm_users_invite UUID;
  perm_users_update UUID;
  perm_users_delete UUID;
  perm_users_update_role UUID;
  perm_roles_read UUID;
  perm_roles_create UUID;
  perm_roles_update UUID;
  perm_roles_delete UUID;
  perm_clients_read UUID;
  perm_clients_create UUID;
  perm_clients_update UUID;
  perm_clients_delete UUID;
  perm_quotes_read UUID;
  perm_quotes_create UUID;
  perm_quotes_update UUID;
  perm_quotes_delete UUID;
  perm_quotes_send UUID;
  perm_invoices_read UUID;
  perm_invoices_create UUID;
  perm_invoices_update UUID;
  perm_invoices_delete UUID;
  perm_invoices_send UUID;
  perm_payments_read UUID;
  perm_payments_create UUID;
  perm_payments_refund UUID;
  perm_planning_read UUID;
  perm_planning_create UUID;
  perm_planning_update UUID;
  perm_planning_delete UUID;
  perm_leaves_read UUID;
  perm_leaves_create UUID;
  perm_leaves_update UUID;
  perm_leaves_approve UUID;
  perm_messages_read UUID;
  perm_messages_send UUID;
  perm_messages_delete UUID;
  perm_audit_read UUID;
BEGIN
  -- Récupérer les IDs des permissions
  SELECT id INTO perm_company_read FROM public.permissions WHERE key = 'company.read';
  SELECT id INTO perm_company_update FROM public.permissions WHERE key = 'company.update';
  SELECT id INTO perm_company_delete FROM public.permissions WHERE key = 'company.delete';
  SELECT id INTO perm_company_settings FROM public.permissions WHERE key = 'company.settings';
  SELECT id INTO perm_users_read FROM public.permissions WHERE key = 'users.read';
  SELECT id INTO perm_users_invite FROM public.permissions WHERE key = 'users.invite';
  SELECT id INTO perm_users_update FROM public.permissions WHERE key = 'users.update';
  SELECT id INTO perm_users_delete FROM public.permissions WHERE key = 'users.delete';
  SELECT id INTO perm_users_update_role FROM public.permissions WHERE key = 'users.update_role';
  SELECT id INTO perm_roles_read FROM public.permissions WHERE key = 'roles.read';
  SELECT id INTO perm_roles_create FROM public.permissions WHERE key = 'roles.create';
  SELECT id INTO perm_roles_update FROM public.permissions WHERE key = 'roles.update';
  SELECT id INTO perm_roles_delete FROM public.permissions WHERE key = 'roles.delete';
  SELECT id INTO perm_clients_read FROM public.permissions WHERE key = 'clients.read';
  SELECT id INTO perm_clients_create FROM public.permissions WHERE key = 'clients.create';
  SELECT id INTO perm_clients_update FROM public.permissions WHERE key = 'clients.update';
  SELECT id INTO perm_clients_delete FROM public.permissions WHERE key = 'clients.delete';
  SELECT id INTO perm_quotes_read FROM public.permissions WHERE key = 'quotes.read';
  SELECT id INTO perm_quotes_create FROM public.permissions WHERE key = 'quotes.create';
  SELECT id INTO perm_quotes_update FROM public.permissions WHERE key = 'quotes.update';
  SELECT id INTO perm_quotes_delete FROM public.permissions WHERE key = 'quotes.delete';
  SELECT id INTO perm_quotes_send FROM public.permissions WHERE key = 'quotes.send';
  SELECT id INTO perm_invoices_read FROM public.permissions WHERE key = 'invoices.read';
  SELECT id INTO perm_invoices_create FROM public.permissions WHERE key = 'invoices.create';
  SELECT id INTO perm_invoices_update FROM public.permissions WHERE key = 'invoices.update';
  SELECT id INTO perm_invoices_delete FROM public.permissions WHERE key = 'invoices.delete';
  SELECT id INTO perm_invoices_send FROM public.permissions WHERE key = 'invoices.send';
  SELECT id INTO perm_payments_read FROM public.permissions WHERE key = 'payments.read';
  SELECT id INTO perm_payments_create FROM public.permissions WHERE key = 'payments.create';
  SELECT id INTO perm_payments_refund FROM public.permissions WHERE key = 'payments.refund';
  SELECT id INTO perm_planning_read FROM public.permissions WHERE key = 'planning.read';
  SELECT id INTO perm_planning_create FROM public.permissions WHERE key = 'planning.create';
  SELECT id INTO perm_planning_update FROM public.permissions WHERE key = 'planning.update';
  SELECT id INTO perm_planning_delete FROM public.permissions WHERE key = 'planning.delete';
  SELECT id INTO perm_leaves_read FROM public.permissions WHERE key = 'leaves.read';
  SELECT id INTO perm_leaves_create FROM public.permissions WHERE key = 'leaves.create';
  SELECT id INTO perm_leaves_update FROM public.permissions WHERE key = 'leaves.update';
  SELECT id INTO perm_leaves_approve FROM public.permissions WHERE key = 'leaves.approve';
  SELECT id INTO perm_messages_read FROM public.permissions WHERE key = 'messages.read';
  SELECT id INTO perm_messages_send FROM public.permissions WHERE key = 'messages.send';
  SELECT id INTO perm_messages_delete FROM public.permissions WHERE key = 'messages.delete';
  SELECT id INTO perm_audit_read FROM public.permissions WHERE key = 'audit.read';

  -- ============================================================
  -- 1) RÔLE: OWNER (Patron - Tous les droits)
  -- ============================================================
  INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
  VALUES (
    company_uuid,
    'Patron',
    'owner',
    'Propriétaire de l''entreprise avec tous les droits',
    true,
    false,
    '#8b5cf6',
    'crown'
  )
  RETURNING id INTO role_owner_id;

  -- Assigner TOUTES les permissions au OWNER
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_owner_id, id FROM public.permissions
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- ============================================================
  -- 2) RÔLE: ADMIN (Administrateur - Droits élevés mais limités)
  -- ============================================================
  INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
  VALUES (
    company_uuid,
    'Administrateur',
    'admin',
    'Administrateur avec droits élevés mais limités',
    true,
    false,
    '#3b82f6',
    'shield'
  )
  RETURNING id INTO role_admin_id;

  -- Permissions ADMIN
  INSERT INTO public.role_permissions (role_id, permission_id)
  VALUES
    (role_admin_id, perm_company_read),
    (role_admin_id, perm_company_update),
    (role_admin_id, perm_users_read),
    (role_admin_id, perm_users_invite),
    (role_admin_id, perm_users_update),
    (role_admin_id, perm_clients_read),
    (role_admin_id, perm_clients_create),
    (role_admin_id, perm_clients_update),
    (role_admin_id, perm_clients_delete),
    (role_admin_id, perm_quotes_read),
    (role_admin_id, perm_quotes_create),
    (role_admin_id, perm_quotes_update),
    (role_admin_id, perm_quotes_delete),
    (role_admin_id, perm_quotes_send),
    (role_admin_id, perm_invoices_read),
    (role_admin_id, perm_invoices_create),
    (role_admin_id, perm_invoices_update),
    (role_admin_id, perm_invoices_delete),
    (role_admin_id, perm_invoices_send),
    (role_admin_id, perm_payments_read),
    (role_admin_id, perm_planning_read),
    (role_admin_id, perm_planning_create),
    (role_admin_id, perm_planning_update),
    (role_admin_id, perm_planning_delete),
    (role_admin_id, perm_messages_read),
    (role_admin_id, perm_messages_send)
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- ============================================================
  -- 3) RÔLE: RH (Ressources Humaines - Gestion du personnel)
  -- ============================================================
  INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
  VALUES (
    company_uuid,
    'RH',
    'rh',
    'Gestion des ressources humaines et du planning',
    true,
    false,
    '#10b981',
    'users'
  )
  RETURNING id INTO role_rh_id;

  -- Permissions RH
  INSERT INTO public.role_permissions (role_id, permission_id)
  VALUES
    (role_rh_id, perm_company_read),
    (role_rh_id, perm_users_read),
    (role_rh_id, perm_users_update),
    (role_rh_id, perm_planning_read),
    (role_rh_id, perm_planning_create),
    (role_rh_id, perm_planning_update),
    (role_rh_id, perm_planning_delete),
    (role_rh_id, perm_leaves_read),
    (role_rh_id, perm_leaves_create),
    (role_rh_id, perm_leaves_update),
    (role_rh_id, perm_leaves_approve),
    (role_rh_id, perm_messages_read),
    (role_rh_id, perm_messages_send)
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- ============================================================
  -- 4) RÔLE: EMPLOYEE (Employé - Accès strictement personnel)
  -- ============================================================
  INSERT INTO public.roles (company_id, name, slug, description, is_system, is_default, color, icon)
  VALUES (
    company_uuid,
    'Employé',
    'employee',
    'Employé avec accès strictement personnel',
    true,
    true,
    '#6b7280',
    'user'
  )
  RETURNING id INTO role_employee_id;

  -- Permissions EMPLOYEE
  INSERT INTO public.role_permissions (role_id, permission_id)
  VALUES
    (role_employee_id, perm_company_read),
    (role_employee_id, perm_users_read),
    (role_employee_id, perm_planning_read),
    (role_employee_id, perm_planning_update),
    (role_employee_id, perm_leaves_read),
    (role_employee_id, perm_leaves_create),
    (role_employee_id, perm_messages_read),
    (role_employee_id, perm_messages_send)
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '✅ Rôles système créés pour l''entreprise %', company_uuid;
END;
$$;

COMMENT ON FUNCTION public.create_system_roles_for_company IS 'Crée les 4 rôles système (OWNER, ADMIN, RH, EMPLOYEE) pour une entreprise';

-- ============================================================================
-- TRIGGER: Créer les rôles système automatiquement pour chaque nouvelle entreprise
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_create_system_roles_on_company_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer les rôles système pour la nouvelle entreprise
  PERFORM public.create_system_roles_for_company(NEW.id);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_roles_on_company_insert ON public.companies;
CREATE TRIGGER trigger_create_roles_on_company_insert
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_system_roles_on_company_creation();

COMMENT ON FUNCTION public.trigger_create_system_roles_on_company_creation IS 'Trigger pour créer automatiquement les rôles système lors de la création d''une entreprise';

-- ============================================================================
-- MIGRATION: Créer les rôles pour les entreprises existantes
-- ============================================================================

DO $$
DECLARE
  company_record RECORD;
  companies_count INTEGER := 0;
BEGIN
  -- Pour chaque entreprise existante sans rôles
  FOR company_record IN 
    SELECT DISTINCT c.id, c.name
    FROM public.companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.roles r 
      WHERE r.company_id = c.id 
      AND r.slug = 'owner'
    )
  LOOP
    -- Créer les rôles système
    PERFORM public.create_system_roles_for_company(company_record.id);
    companies_count := companies_count + 1;
    RAISE NOTICE '  → Rôles créés pour: %', company_record.name;
  END LOOP;
  
  IF companies_count > 0 THEN
    RAISE NOTICE '✅ % entreprise(s) ont reçu leurs rôles système', companies_count;
  ELSE
    RAISE NOTICE 'ℹ️  Aucune entreprise sans rôles trouvée';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION: Assigner les rôles OWNER aux utilisateurs existants
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  owner_role_id UUID;
  updated_count INTEGER := 0;
BEGIN
  -- Pour chaque utilisateur dans company_users sans role_id
  FOR user_record IN 
    SELECT cu.user_id, cu.company_id, cu.role AS old_role, c.name AS company_name
    FROM public.company_users cu
    JOIN public.companies c ON c.id = cu.company_id
    WHERE cu.role_id IS NULL
  LOOP
    -- Récupérer le rôle correspondant
    IF user_record.old_role = 'owner' OR user_record.old_role = 'admin' THEN
      -- Assigner le rôle OWNER
      SELECT id INTO owner_role_id
      FROM public.roles
      WHERE company_id = user_record.company_id
      AND slug = 'owner'
      LIMIT 1;
    ELSIF user_record.old_role = 'rh' THEN
      -- Assigner le rôle RH
      SELECT id INTO owner_role_id
      FROM public.roles
      WHERE company_id = user_record.company_id
      AND slug = 'rh'
      LIMIT 1;
    ELSE
      -- Par défaut: EMPLOYEE
      SELECT id INTO owner_role_id
      FROM public.roles
      WHERE company_id = user_record.company_id
      AND slug = 'employee'
      LIMIT 1;
    END IF;

    -- Mettre à jour le role_id
    IF owner_role_id IS NOT NULL THEN
      UPDATE public.company_users
      SET role_id = owner_role_id
      WHERE user_id = user_record.user_id
      AND company_id = user_record.company_id;
      
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  IF updated_count > 0 THEN
    RAISE NOTICE '✅ % utilisateur(s) ont reçu leur role_id', updated_count;
  ELSE
    RAISE NOTICE 'ℹ️  Aucun utilisateur sans role_id trouvé';
  END IF;
END $$;

-- ============================================================================
-- FIN DU SEED
-- ============================================================================
