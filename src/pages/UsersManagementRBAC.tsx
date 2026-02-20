/**
 * Page: UsersManagementRBAC
 * Description: Page de gestion des utilisateurs avec rôles RBAC
 * Permissions requises: employees.access
 */

import { useState, useEffect } from 'react';
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
import { BackButton } from '@/components/ui/BackButton';
import { Users, Shield, Crown, Edit, Trash2, UserPlus, AlertTriangle, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RouteGuard } from '@/components/rbac/RouteGuard';
import { InviteUserDialogRBAC } from '@/components/admin/InviteUserDialogRBAC';
import { EmployeePermissionsDialog } from '@/components/admin/EmployeePermissionsDialog';
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

interface UsersManagementRBACProps {
  /** Quand true, le composant est affiché dans un onglet (ex: Paramètres > Employés) sans layout complet */
  embedded?: boolean;
}

export default function UsersManagementRBAC({ embedded = false }: UsersManagementRBACProps) {
  const { currentCompanyId, user: currentUser } = useAuth();
  const { can, isOwner, isAdmin, roleSlug, loading: permissionsLoading } = usePermissions();
  const { roles } = useRoles();
  const queryClient = useQueryClient();

  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [newRoleId, setNewRoleId] = useState<string>('');
  
  // Vérification alternative : vérifier directement dans company_users si l'utilisateur est owner
  // Cette vérification est nécessaire car usePermissions peut ne pas détecter correctement le rôle owner
  const [isOwnerDirect, setIsOwnerDirect] = useState<boolean | null>(null);

  // Récupérer tous les utilisateurs de l'entreprise (RPC pour éviter embed auth.users → 400)
  // IMPORTANT: Ce hook doit être appelé AVANT tout return conditionnel (Rules of Hooks)
  const { data: companyUsers = [], isLoading, isError, error: queryError } = useQuery({
    queryKey: ['company-users', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase.rpc('get_company_users_with_profile', {
        p_company_id: currentCompanyId,
      });
      if (!error) {
        const rows = (data ?? []) as Array<{
          id: string;
          user_id: string;
          company_id: string;
          role_id: string;
          status: string;
          created_at: string;
          email: string | null;
          raw_user_meta_data: { first_name?: string; last_name?: string } | null;
          role_pk: string;
          role_name: string;
          role_slug: string;
          role_color: string;
          role_is_system: boolean;
        }>;
        return rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          company_id: row.company_id,
          role_id: row.role_id,
          status: row.status,
          created_at: row.created_at,
          users: {
            email: row.email ?? '',
            raw_user_meta_data: row.raw_user_meta_data ?? {},
          },
          roles: {
            id: row.role_pk,
            name: row.role_name,
            slug: row.role_slug,
            color: row.role_color,
            is_system: row.role_is_system,
          },
        })) as CompanyUser[];
      }
      // Fallback si la RPC n'existe pas (PGRST202) : requête REST sans embed auth.users pour éviter 400
      if (error?.code === 'PGRST202') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('company_users')
          .select('id, user_id, company_id, role_id, status, created_at, roles:role_id(id, name, slug, color, is_system)')
          .eq('company_id', currentCompanyId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        const rows = (fallbackData ?? []) as Array<{
          id: string;
          user_id: string;
          company_id: string;
          role_id: string;
          status: string;
          created_at: string;
          roles: { id: string; name: string; slug: string; color: string; is_system: boolean };
        }>;
        return rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          company_id: row.company_id,
          role_id: row.role_id,
          status: row.status,
          created_at: row.created_at,
          users: { email: '—', raw_user_meta_data: {} },
          roles: row.roles,
        })) as CompanyUser[];
      }
      throw error;
    },
    enabled: !!currentCompanyId && (can('employees.access') || isOwner || isOwnerDirect === true),
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

  // Supprimer un utilisateur (appelle l'Edge Function pour nettoyer le compte Auth si orphelin)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('remove-user-from-company', {
        body: { user_id: userId, company_id: currentCompanyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
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

  // useEffect pour vérifier si l'utilisateur est owner directement dans company_users
  useEffect(() => {
    const checkOwnerDirect = async () => {
      if (!currentUser?.id || !currentCompanyId) {
        return; // Ne pas set à false, garder null pendant le chargement
      }
      
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select('role_id, roles!inner(slug, name)')
          .eq('user_id', currentUser.id)
          .eq('company_id', currentCompanyId)
          .maybeSingle();
        
        if (error) {
          setIsOwnerDirect(false);
          return;
        }
        
        if (data?.roles) {
          const slug = data.roles.slug;
          const name = (data.roles.name || '').toLowerCase();
          const isOwnerCheck = slug === 'owner' || ['patron', 'propriétaire', 'dirigeant', 'owner'].some((s) => name.includes(s));
          setIsOwnerDirect(isOwnerCheck);
        } else {
          setIsOwnerDirect(false);
        }
      } catch (err) {
        setIsOwnerDirect(false);
      }
    };
    
    if (currentUser?.id && currentCompanyId) {
      checkOwnerDirect();
    }
  }, [currentUser?.id, currentCompanyId]);
  
  // Les owners ont toujours accès à la gestion des employés
  // Utiliser isOwnerDirect comme fallback si isOwner n'est pas détecté correctement
  const hasAccess = can('employees.access') || isOwner || isOwnerDirect === true;
  
  // Afficher un loader pendant le chargement (company, permissions, owner check)
  if (!currentCompanyId || permissionsLoading || isOwnerDirect === null) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </Card>
    );
  }
  
  if (!hasAccess) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <p className="text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-muted-foreground mt-2">
            Debug: can={can('employees.access') ? 'true' : 'false'}, isOwner={isOwner ? 'true' : 'false'}, isOwnerDirect={isOwnerDirect === null ? 'loading' : isOwnerDirect ? 'true' : 'false'}, roleSlug={roleSlug || 'null'}
          </p>
        )}
      </Card>
    );
  }

  const canInvite = can('employees.access') || isOwner || isOwnerDirect === true || isAdmin;
  const inviteButton = canInvite ? (
    <InviteUserDialogRBAC
      onSuccess={() => queryClient.invalidateQueries({ queryKey: ['company-users'] })}
    />
  ) : (
    <Button
      variant="default"
      onClick={() =>
        toast({
          title: 'Permission requise',
          description: 'Seuls les responsables ou administrateurs peuvent inviter des membres.',
          variant: 'destructive',
        })
      }
    >
      <UserPlus className="h-4 w-4 mr-2" />
      Inviter un employé
    </Button>
  );

  const content = (
    <>
      {/* Bouton retour */}
      {!embedded && <BackButton className="mb-4" />}
      
      {/* Barre d'action : uniquement le bouton Inviter (pas de recherche en mode embedded) */}
      {!embedded && inviteButton ? (
        <div className="flex justify-end mb-4">
          {inviteButton}
        </div>
      ) : embedded && inviteButton ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 mb-4">
          <BackButton />
          {inviteButton}
        </div>
      ) : null}

      {/* Liste des utilisateurs */}
      <div className="grid gap-4">
        {companyUsers.map((companyUser) => {
          const firstName = companyUser.users.raw_user_meta_data?.first_name || '';
          const lastName = companyUser.users.raw_user_meta_data?.last_name || '';
          const displayName = firstName || companyUser.users.email;
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
                      <h3 className="font-semibold">{displayName}</h3>
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
                    {(can('users.update_role') || isOwner || isOwnerDirect === true) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChangeRole(companyUser)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Changer le rôle
                      </Button>
                    )}

                    {/* Bouton Gérer les permissions (uniquement pour les employés) */}
                    {(isOwner || isOwnerDirect === true) && companyUser.roles?.slug === 'employee' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(companyUser);
                          setPermissionsDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Permissions
                      </Button>
                    )}

                    {(can('users.delete') || isOwner || isOwnerDirect === true) && (
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
            <p className="text-muted-foreground mb-6">
              Aucun utilisateur trouvé. Invitez des membres à rejoindre votre entreprise !
            </p>
            {inviteButton ? (
              <div className="flex justify-center">
                {inviteButton}
              </div>
            ) : null}
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
                {roles
                  .filter((role) => role.slug === 'owner' || role.slug === 'employee')
                  .map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        {role.slug === 'owner' && <Crown className="h-4 w-4" />}
                        <span>{role.name}</span>
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

      {/* Dialog: Gérer les permissions de l'employé */}
      {selectedUser && currentCompanyId && (
        <EmployeePermissionsDialog
          isOpen={permissionsDialogOpen}
          onClose={() => {
            setPermissionsDialogOpen(false);
            setSelectedUser(null);
          }}
          employeeId={selectedUser.user_id}
          employeeName={`${selectedUser.users?.raw_user_meta_data?.first_name || ''} ${selectedUser.users?.raw_user_meta_data?.last_name || ''}`.trim() || selectedUser.users?.email || 'Employé'}
          companyId={currentCompanyId}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4 min-w-0">
        {content}
      </div>
    );
  }

  return (
    <PageLayout
      title="Gestion des utilisateurs"
      subtitle="Gérer les membres de votre entreprise et leurs rôles"
      icon={Users}
    >
      {content}
    </PageLayout>
  );
}

// Wrapper avec RouteGuard
export function UsersManagementRBACGuarded() {
  return (
    <RouteGuard permission="employees.access">
      <UsersManagementRBAC />
    </RouteGuard>
  );
}

