/**
 * Component: RouteGuard
 * Description: Guard pour protéger les routes en fonction des permissions
 * Usage: Envelopper une route pour la rendre accessible uniquement si l'utilisateur a les permissions
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  redirectTo?: string;
  showLoading?: boolean;
}

/**
 * Guard pour protéger les routes
 * 
 * @param {RouteGuardProps} props - Props du composant
 * @returns {ReactNode} Children si permissions OK, redirection sinon
 * 
 * @example
 * // Dans votre routing
 * <Route 
 *   path="/roles" 
 *   element={
 *     <RouteGuard permission="roles.read">
 *       <RolesManagement />
 *     </RouteGuard>
 *   } 
 * />
 */
export const RouteGuard = ({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/dashboard',
  showLoading = true,
}: RouteGuardProps) => {
  const { can, canAll, canAny, loading } = usePermissions();

  // Afficher le loading
  if (loading && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Vérifier une seule permission
  if (permission && !can(permission)) {
    console.warn('🚫 [RouteGuard] Access denied - missing permission:', permission);
    return <Navigate to={redirectTo} replace />;
  }

  // Vérifier plusieurs permissions
  if (permissions && permissions.length > 0) {
    const hasPermission = requireAll 
      ? canAll(permissions) 
      : canAny(permissions);

    if (!hasPermission) {
      console.warn('🚫 [RouteGuard] Access denied - missing permissions:', permissions);
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

/**
 * Guard pour protéger les routes basé sur le rôle
 */

interface RoleRouteGuardProps {
  children: ReactNode;
  roles: ('owner' | 'admin' | 'rh' | 'employee')[];
  redirectTo?: string;
  showLoading?: boolean;
}

export const RoleRouteGuard = ({
  children,
  roles,
  redirectTo = '/dashboard',
  showLoading = true,
}: RoleRouteGuardProps) => {
  const { roleSlug, loading } = usePermissions();

  if (loading && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roleSlug || !roles.includes(roleSlug as any)) {
    console.warn('🚫 [RoleRouteGuard] Access denied - role not allowed:', roleSlug);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

