-- ============================================================================
-- SCRIPT 2/2 : Insérer les permissions et mettre à jour la fonction
-- COPIEZ ET COLLEZ CE SCRIPT DANS SUPABASE SQL EDITOR (APRÈS LE SCRIPT 1)
-- ============================================================================

-- 1) Insérer les permissions de base
INSERT INTO public.permissions (key, resource, action, category, description)
VALUES
  ('clients.read', 'clients', 'read', 'business', 'Voir les clients'),
  ('clients.create', 'clients', 'create', 'business', 'Créer des clients'),
  ('clients.update', 'clients', 'update', 'business', 'Modifier les clients'),
  ('clients.delete', 'clients', 'delete', 'business', 'Supprimer les clients'),
  ('projects.read', 'projects', 'read', 'business', 'Voir les projets'),
  ('projects.create', 'projects', 'create', 'business', 'Créer des projets'),
  ('projects.update', 'projects', 'update', 'business', 'Modifier les projets'),
  ('projects.delete', 'projects', 'delete', 'business', 'Supprimer les projets'),
  ('quotes.read', 'quotes', 'read', 'business', 'Voir les devis'),
  ('quotes.create', 'quotes', 'create', 'business', 'Créer des devis'),
  ('quotes.update', 'quotes', 'update', 'business', 'Modifier les devis'),
  ('quotes.delete', 'quotes', 'delete', 'business', 'Supprimer les devis'),
  ('quotes.send', 'quotes', 'send', 'business', 'Envoyer des devis'),
  ('invoices.read', 'invoices', 'read', 'business', 'Voir les factures'),
  ('invoices.create', 'invoices', 'create', 'business', 'Créer des factures'),
  ('invoices.update', 'invoices', 'update', 'business', 'Modifier les factures'),
  ('invoices.delete', 'invoices', 'delete', 'business', 'Supprimer les factures'),
  ('invoices.send', 'invoices', 'send', 'business', 'Envoyer les factures'),
  ('users.read', 'users', 'read', 'hr', 'Voir les employés'),
  ('users.invite', 'users', 'invite', 'hr', 'Inviter des employés'),
  ('company.settings', 'company', 'settings', 'company', 'Gérer les paramètres de l''entreprise')
ON CONFLICT (key) DO NOTHING;

-- 2) Mettre à jour la fonction get_user_permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  user_uuid UUID,
  company_uuid UUID
)
RETURNS TABLE(permission_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
  role_perms AS (
    SELECT DISTINCT p.key
    FROM company_users cu
    JOIN roles r ON r.id = cu.role_id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = user_uuid
      AND cu.company_id = company_uuid
  ),
  custom_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = true
  ),
  revoked_perms AS (
    SELECT DISTINCT p.key
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_uuid
      AND up.company_id = company_uuid
      AND up.granted = false
  )
  SELECT key FROM (
    SELECT key FROM role_perms
    UNION
    SELECT key FROM custom_perms
  ) combined_perms
  WHERE key NOT IN (SELECT key FROM revoked_perms);
END;
$$;

-- 3) Vérification
DO $$
DECLARE
  table_exists BOOLEAN;
  perm_count INTEGER;
BEGIN
  -- Vérifier que la table existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_permissions'
  ) INTO table_exists;
  
  -- Compter les permissions
  SELECT COUNT(*) INTO perm_count FROM public.permissions;
  
  -- Afficher les résultats
  IF table_exists THEN
    RAISE NOTICE '✅ Table user_permissions créée avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur : La table user_permissions n''existe pas';
  END IF;
  
  RAISE NOTICE '✅ Total de % permissions dans la base', perm_count;
  RAISE NOTICE '🎉 Installation terminée ! Vous pouvez maintenant utiliser les permissions personnalisées.';
END $$;

-- ============================================================================
-- ✅ SCRIPT 2/2 TERMINÉ
-- Cliquez sur RUN (ou appuyez sur Cmd+Enter / Ctrl+Enter)
-- Attendez le message "Success" avec les ✅
-- Puis rafraîchissez votre application (F5)
-- ============================================================================
