/**
 * Page: UsersManagementRBAC
 * Description: Page de gestion des utilisateurs avec rôles RBAC
 * Permissions requises: users.read
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLayout } from '@/components/layout/PageLayout';
import { Users, Shield, Crown, Edit, Trash2, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RouteGuard } from '@/components/rbac/RouteGuard';
import { InviteUserDialogRBAC } from '@/components/admin/InviteUserDialogRBAC';
import { AuditLogHelpers } from '@/services/auditLogService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompanyUser {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string;
  status: string;
  created_at: string;
  users: {
    email: string;
    raw_user_meta_data: {
      first_name?: string;
      last_name?: string;
    };
  };
  roles: {
    id: string;
    name: string;
    slug: string;
    color: string;
    is_system: boolean;
  };
}

export default function UsersManagementRBAC() {
  const { currentCompanyId, user: currentUser } = useAuth();
  const { can, isOwner } = usePermissions();
  const { roles } = useRoles();
  const queryClient = useQueryClient();

  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [newRoleId, setNewRoleId] = useState<string>('');

  // Récupérer tous les utilisateurs de l'entreprise
  const { data: companyUsers = [], isLoading } = useQuery({
    queryKey: ['company-users', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      const { data, error } = await supabase
        .from('company_users')
        .select(`
          *,
          users:user_id(email, raw_user_meta_data),
          roles:role_id(id, name, slug, color, is_system)
        `)
        .eq('company_id', currentCompanyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CompanyUser[];
    },
    enabled: !!currentCompanyId && can('users.read'),
  });

  // Changer le rôle d'un utilisateur
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRoleId }: { userId: string; newRoleId: string }) => {
      const { error } = await supabase
        .from('company_users')
        .update({ role_id: newRoleId })
        .eq('user_id', userId)
        .eq('company_id', currentCompanyId);

      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-role'] });

      // Log audit
      if (currentUser && selectedUser) {
        const oldRole = selectedUser.roles.name;
        const newRole = roles.find(r => r.id === variables.newRoleId)?.name || '';
        await AuditLogHelpers.logRoleChange(
          variables.userId,
          oldRole,
          newRole,
          currentUser.id
        );
      }

      toast({
        title: 'Rôle modifié',
        description: 'Le rôle de l\'utilisateur a été modifié avec succès',
      });
      setChangeRoleDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Supprimer un utilisateur
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('company_users')
        .update({ status: 'inactive' })
        .eq('user_id', userId)
        .eq('company_id', currentCompanyId);

      if (error) throw error;
    },
    onSuccess: async (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });

      // Log audit
      if (currentUser && selectedUser) {
        await AuditLogHelpers.logUserDeleted(
          userId,
          selectedUser.users.email,
          currentUser.id
        );
      }

      toast({
        title: 'Utilisateur supprimé',
        description: 'L\'utilisateur a été retiré de l\'entreprise',
      });
      setDeleteUserDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Ouvrir le dialog de changement de rôle
  const handleOpenChangeRole = (user: CompanyUser) => {
    setSelectedUser(user);
    setNewRoleId(user.role_id);
    setChangeRoleDialogOpen(true);
  };

  // Changer le rôle
  const handleChangeRole = () => {
    if (!selectedUser || !newRoleId) return;
    changeRoleMutation.mutate({ userId: selectedUser.user_id, newRoleId });
  };

  // Supprimer l'utilisateur
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.user_id);
  };

  if (!can('users.read')) {
    return (
      <PageLayout title="Gestion des utilisateurs" subtitle="Accès refusé" icon={Users}>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-muted-foreground">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Gestion des utilisateurs"
      subtitle="Gérer les membres de votre entreprise et leurs rôles"
      icon={Users}
      actions={
        can('users.invite') && (
          <InviteUserDialogRBAC
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['company-users'] })}
          />
        )
      }
    >
      {/* Liste des utilisateurs */}
      <div className="grid gap-4">
        {companyUsers.map((companyUser) => {
          const firstName = companyUser.users.raw_user_meta_data?.first_name || '';
          const lastName = companyUser.users.raw_user_meta_data?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || companyUser.users.email;
          const isCurrentUser = companyUser.user_id === currentUser?.id;
          const isOwnerRole = companyUser.roles.slug === 'owner';

          return (
            <Card key={companyUser.id} className="p-6">
              <div className="flex items-center justify-between">
                {/* Info utilisateur */}
                <div className="flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: companyUser.roles.color }}
                  >
                    {firstName.charAt(0) || companyUser.users.email.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{fullName}</h3>
                      {isCurrentUser && (
                        <Badge variant="secondary">Vous</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {companyUser.users.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        style={{
                          backgroundColor: `${companyUser.roles.color}20`,
                          color: companyUser.roles.color,
                          border: `1px solid ${companyUser.roles.color}40`,
                        }}
                      >
                        {isOwnerRole && <Crown className="h-3 w-3 mr-1" />}
                        {companyUser.roles.name}
                      </Badge>
                      {companyUser.roles.is_system && (
                        <Badge variant="outline" className="text-xs">
                          Système
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Membre depuis{' '}
                      {formatDistanceToNow(new Date(companyUser.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {!isCurrentUser && (
                  <div className="flex gap-2">
                    {can('users.update_role') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChangeRole(companyUser)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Changer le rôle
                      </Button>
                    )}

                    {can('users.delete') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(companyUser);
                          setDeleteUserDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Retirer
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {companyUsers.length === 0 && !isLoading && (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucun utilisateur trouvé. Invitez des membres à rejoindre votre entreprise !
            </p>
          </Card>
        )}
      </div>

      {/* Dialog de changement de rôle */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>
              Sélectionnez le nouveau rôle pour{' '}
              <strong>{selectedUser?.users.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={newRoleId} onValueChange={setNewRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      {role.slug === 'owner' && <Crown className="h-4 w-4" />}
                      <span>{role.name}</span>
                      {role.is_system && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Système
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangeRole} disabled={changeRoleMutation.isPending}>
              Modifier le rôle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer l'utilisateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer{' '}
              <strong>{selectedUser?.users.email}</strong> de votre entreprise ?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

// Wrapper avec RouteGuard
export function UsersManagementRBACGuarded() {
  return (
    <RouteGuard permission="users.read">
      <UsersManagementRBAC />
    </RouteGuard>
  );
}

