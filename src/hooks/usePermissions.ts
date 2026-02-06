/**
 * Hook: usePermissions
 * Description: Gestion des permissions RBAC (Role-Based Access Control)
 * Usage: Vérifier si l'utilisateur a les permissions nécessaires pour effectuer une action
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Permission = string; // 'users.invite', 'invoices.send', etc.

export interface UsePermissionsReturn {
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isRH: boolean;
  isEmployee: boolean;
  roleSlug: string | null;
  roleName: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook pour gérer les permissions de l'utilisateur
 * 
 * @returns {UsePermissionsReturn} Objet contenant les permissions et fonctions de vérification
 * 
 * @example
 * const { can, isOwner } = usePermissions();
 * 
 * if (can('users.invite')) {
 *   // Afficher le bouton "Inviter un employé"
 * }
 * 
 * if (isOwner) {
 *   // Afficher les paramètres critiques
 * }
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, currentCompanyId } = useAuth();

  // Récupérer les permissions de l'utilisateur
  const { 
    data: permissions = [], 
    isLoading: permissionsLoading,
    error: permissionsError 
  } = useQuery({
    queryKey: ['user-permissions', user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user || !currentCompanyId) return [];

      const { data, error } = await supabase.rpc('get_user_permissions', {
        user_uuid: user.id,
        company_uuid: currentCompanyId,
      });

      if (error) {
        console.error('❌ [usePermissions] Error fetching permissions:', error);
        throw error;
      }

      return (data as Permission[]) || [];
    },
    enabled: !!user && !!currentCompanyId,
    staleTime: 30 * 60 * 1000, // 30 minutes - Cache très agressif
    gcTime: 60 * 60 * 1000, // 60 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Ne pas re-fetch lors de la reconnexion
  });

  // Récupérer le rôle de l'utilisateur
  const { 
    data: roleData,
    isLoading: roleLoading,
    error: roleError
  } = useQuery({
    queryKey: ['user-role', user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user || !currentCompanyId) return null;

      const { data, error } = await supabase
        .from('company_users')
        .select('role_id, role, roles(id, slug, name, is_system, color, icon)')
        .eq('user_id', user.id)
        .eq('company_id', currentCompanyId)
        .maybeSingle();

      if (error) {
        console.error('❌ [usePermissions] Error fetching role:', error.message);
        return null;
      }

      if (!data) {
        console.warn('⚠️ [usePermissions] No role data found');
      }
      return data;
    },
    enabled: !!user && !!currentCompanyId,
    staleTime: 30 * 60 * 1000, // 30 minutes - Cache très agressif
    gcTime: 60 * 60 * 1000, // 60 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Prefer roles.slug; fallback to company_users.role when role_id is null (e.g. new company)
  const roleSlug =
    roleData?.roles?.slug ??
    (roleData?.role === 'owner' ? 'owner' : roleData?.role === 'member' ? 'employee' : null) ??
    null;
  const roleName = roleData?.roles?.name ?? null;

  // Propriétaire : slug 'owner' ou nom de rôle équivalent (Patron, Dirigeant, Propriétaire)
  const isOwnerRole = useMemo(() => {
    if (roleSlug === 'owner') return true;
    const name = (roleName || '').toLowerCase();
    return ['patron', 'propriétaire', 'dirigeant', 'owner'].some((s) => name.includes(s));
  }, [roleSlug, roleName]);

  // Fonctions de vérification des permissions
  const can = useMemo(
    () => (permission: Permission): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const canAny = useMemo(
    () => (perms: Permission[]): boolean => {
      return perms.some(p => permissions.includes(p));
    },
    [permissions]
  );

  const canAll = useMemo(
    () => (perms: Permission[]): boolean => {
      return perms.every(p => permissions.includes(p));
    },
    [permissions]
  );

  // Vérifications de rôles
  const isOwner = isOwnerRole;
  const isAdmin = roleSlug === 'admin';
  const isRH = roleSlug === 'rh';
  const isEmployee = roleSlug === 'employee';

  const loading = permissionsLoading || roleLoading;
  const error = (permissionsError || roleError) as Error | null;

  return {
    permissions,
    can,
    canAny,
    canAll,
    isOwner,
    isAdmin,
    isRH,
    isEmployee,
    roleSlug,
    roleName,
    loading,
    error,
  };
}
