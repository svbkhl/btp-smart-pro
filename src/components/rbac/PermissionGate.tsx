/**
 * Component: PermissionGate
 * Description: Composant de garde pour contrôler l'affichage en fonction des permissions
 * Usage: Envelopper un composant pour le rendre visible uniquement si l'utilisateur a les permissions
 */

import { ReactNode } from 'react';
import { usePermissions, Permission } from '@/hooks/usePermissions';

interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // true = AND (toutes), false = OR (au moins une) - default: false
  fallback?: ReactNode;
  showLoading?: boolean;
}

/**
 * Composant de garde basé sur les permissions
 * 
 * @param {PermissionGateProps} props - Props du composant
 * @returns {ReactNode} Children si permissions OK, fallback sinon
 * 
 * @example
 * // Vérifier une seule permission
 * <PermissionGate permission="users.invite">
 *   <Button>Inviter un employé</Button>
 * </PermissionGate>
 * 
 * @example
 * // Vérifier plusieurs permissions (OR)
 * <PermissionGate permissions={['quotes.create', 'invoices.create']}>
 *   <Button>Créer un document</Button>
 * </PermissionGate>
 * 
 * @example
 * // Vérifier plusieurs permissions (AND)
 * <PermissionGate permissions={['quotes.create', 'quotes.send']} requireAll>
 *   <Button>Créer et envoyer un devis</Button>
 * </PermissionGate>
 * 
 * @example
 * // Avec fallback personnalisé
 * <PermissionGate 
 *   permission="payments.read"
 *   fallback={<p>Accès refusé</p>}
 * >
 *   <PaymentsList />
 * </PermissionGate>
 */
export const PermissionGate = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  showLoading = false,
}: PermissionGateProps) => {
  const { can, canAll, canAny, loading } = usePermissions();

  // Afficher le loading si demandé
  if (loading && showLoading) {
    return <>{fallback}</>;
  }

  // Vérifier une seule permission
  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  // Vérifier plusieurs permissions
  if (permissions && permissions.length > 0) {
    const hasPermission = requireAll 
      ? canAll(permissions) 
      : canAny(permissions);

    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

/**
 * Variante: RoleGate
 * Contrôle l'affichage basé sur le rôle
 */

interface RoleGateProps {
  children: ReactNode;
  roles: ('owner' | 'admin' | 'rh' | 'employee')[];
  fallback?: ReactNode;
  showLoading?: boolean;
}

export const RoleGate = ({
  children,
  roles,
  fallback = null,
  showLoading = false,
}: RoleGateProps) => {
  const { roleSlug, loading } = usePermissions();

  if (loading && showLoading) {
    return <>{fallback}</>;
  }

  if (!roleSlug || !roles.includes(roleSlug as any)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
