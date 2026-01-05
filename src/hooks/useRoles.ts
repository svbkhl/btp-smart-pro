/**
 * Hook: useRoles
 * Description: Gestion des rôles de l'entreprise
 * Usage: Récupérer la liste des rôles disponibles dans l'entreprise
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Role {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  is_default: boolean;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface RoleWithCount extends Role {
  user_count?: number;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions: string[]; // IDs des permissions
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions?: string[]; // IDs des permissions
}

/**
 * Hook pour gérer les rôles de l'entreprise
 */
export function useRoles() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer tous les rôles de l'entreprise
  const { data: roles = [], isLoading, error, refetch } = useQuery({
    queryKey: ['roles', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      console.log('🎭 [useRoles] Fetching roles for company:', currentCompanyId);

      const { data, error } = await supabase
        .from('roles')
        .select(`
          *,
          company_users(count)
        `)
        .eq('company_id', currentCompanyId)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ [useRoles] Error fetching roles:', error);
        throw error;
      }

      // Transformer les données pour inclure le count
      const rolesWithCount: RoleWithCount[] = data.map(role => ({
        ...role,
        user_count: role.company_users?.[0]?.count || 0,
      }));

      console.log('✅ [useRoles] Roles loaded:', rolesWithCount);
      return rolesWithCount;
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  // Récupérer les permissions d'un rôle spécifique
  const useRolePermissions = (roleId: string) => {
    return useQuery({
      queryKey: ['role-permissions', roleId],
      queryFn: async () => {
        console.log('🔑 [useRoles] Fetching permissions for role:', roleId);

        const { data, error } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions(id, key, resource, action, description, category)')
          .eq('role_id', roleId);

        if (error) {
          console.error('❌ [useRoles] Error fetching role permissions:', error);
          throw error;
        }

        const permissions = data.map(rp => rp.permissions).filter(Boolean);
        console.log('✅ [useRoles] Permissions loaded:', permissions);
        return permissions;
      },
      enabled: !!roleId,
    });
  };

  // Créer un nouveau rôle
  const createRole = useMutation({
    mutationFn: async (roleData: CreateRoleData) => {
      if (!currentCompanyId) {
        throw new Error('Aucune entreprise sélectionnée');
      }

      console.log('➕ [useRoles] Creating role:', roleData);

      // 1. Créer le rôle
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .insert({
          company_id: currentCompanyId,
          name: roleData.name,
          slug: roleData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          description: roleData.description || null,
          color: roleData.color || '#3b82f6',
          icon: roleData.icon || 'user',
          is_system: false,
          is_default: false,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // 2. Assigner les permissions
      if (roleData.permissions.length > 0) {
        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(
            roleData.permissions.map(permissionId => ({
              role_id: role.id,
              permission_id: permissionId,
            }))
          );

        if (permError) throw permError;
      }

      console.log('✅ [useRoles] Role created:', role);
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Rôle créé',
        description: 'Le rôle a été créé avec succès.',
      });
    },
    onError: (error: Error) => {
      console.error('❌ [useRoles] Error creating role:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mettre à jour un rôle
  const updateRole = useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: UpdateRoleData }) => {
      console.log('✏️ [useRoles] Updating role:', { roleId, data });

      // 1. Mettre à jour le rôle
      if (data.name || data.description || data.color || data.icon) {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.color) updateData.color = data.color;
        if (data.icon) updateData.icon = data.icon;

        const { error: roleError } = await supabase
          .from('roles')
          .update(updateData)
          .eq('id', roleId);

        if (roleError) throw roleError;
      }

      // 2. Mettre à jour les permissions
      if (data.permissions) {
        // Supprimer toutes les permissions existantes
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId);

        if (deleteError) throw deleteError;

        // Ajouter les nouvelles permissions
        if (data.permissions.length > 0) {
          const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(
              data.permissions.map(permissionId => ({
                role_id: roleId,
                permission_id: permissionId,
              }))
            );

          if (insertError) throw insertError;
        }
      }

      console.log('✅ [useRoles] Role updated');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({
        title: 'Rôle modifié',
        description: 'Le rôle a été modifié avec succès.',
      });
    },
    onError: (error: Error) => {
      console.error('❌ [useRoles] Error updating role:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Supprimer un rôle
  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      console.log('🗑️ [useRoles] Deleting role:', roleId);

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      console.log('✅ [useRoles] Role deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Rôle supprimé',
        description: 'Le rôle a été supprimé avec succès.',
      });
    },
    onError: (error: Error) => {
      console.error('❌ [useRoles] Error deleting role:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    roles,
    isLoading,
    error,
    refetch,
    useRolePermissions,
    createRole: createRole.mutate,
    createRoleAsync: createRole.mutateAsync,
    isCreating: createRole.isPending,
    updateRole: updateRole.mutate,
    updateRoleAsync: updateRole.mutateAsync,
    isUpdating: updateRole.isPending,
    deleteRole: deleteRole.mutate,
    deleteRoleAsync: deleteRole.mutateAsync,
    isDeleting: deleteRole.isPending,
  };
}
