/**
 * Page: RolesManagement
 * Description: Page de gestion des rôles de l'entreprise
 * Permissions requises: roles.read
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoles, Role } from '@/hooks/useRoles';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLayout } from '@/components/layout/PageLayout';
import { Shield, Plus, Edit, Trash2, Users, Crown, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RouteGuard } from '@/components/rbac/RouteGuard';
import { AuditLogHelpers } from '@/services/auditLogService';

interface Permission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string;
  category: string;
}

export default function RolesManagement() {
  const { currentCompanyId, user } = useAuth();
  const { can, isOwner } = usePermissions();
  const { roles, isLoading: rolesLoading, createRole, updateRole, deleteRole } = useRoles();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Formulaire de création/édition
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'user',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Récupérer toutes les permissions disponibles
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category, resource, action');

      if (error) throw error;
      return data as Permission[];
    },
  });

  // Grouper les permissions par catégorie
  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Récupérer les permissions d'un rôle
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return [];

      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(id, key)')
        .eq('role_id', selectedRole.id);

      if (error) throw error;
      return data.map(rp => rp.permission_id);
    },
    enabled: !!selectedRole,
  });

  // Ouvrir le dialog de création
  const handleOpenCreate = () => {
    setFormData({ name: '', description: '', color: '#3b82f6', icon: 'user' });
    setSelectedPermissions([]);
    setCreateDialogOpen(true);
  };

  // Ouvrir le dialog d'édition
  const handleOpenEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      color: role.color,
      icon: role.icon,
    });
    setSelectedPermissions(rolePermissions);
    setEditDialogOpen(true);
  };

  // Créer un rôle
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Erreur', description: 'Le nom du rôle est requis', variant: 'destructive' });
      return;
    }

    createRole(
      {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        permissions: selectedPermissions,
      },
      {
        onSuccess: async (role) => {
          setCreateDialogOpen(false);
          // Log audit
          if (user) {
            await AuditLogHelpers.logRoleCreated(role.id, role.name, selectedPermissions);
          }
        },
      }
    );
  };

  // Mettre à jour un rôle
  const handleUpdate = async () => {
    if (!selectedRole) return;

    updateRole(
      {
        roleId: selectedRole.id,
        data: {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          icon: formData.icon,
          permissions: selectedPermissions,
        },
      },
      {
        onSuccess: async () => {
          setEditDialogOpen(false);
          // Log audit
          if (user) {
            await AuditLogHelpers.logRoleUpdated(selectedRole.id, selectedRole.name, formData);
          }
        },
      }
    );
  };

  // Supprimer un rôle
  const handleDelete = async () => {
    if (!selectedRole) return;

    deleteRole(selectedRole.id, {
      onSuccess: async () => {
        setDeleteDialogOpen(false);
        // Log audit
        if (user) {
          await AuditLogHelpers.logRoleDeleted(selectedRole.id, selectedRole.name);
        }
      },
    });
  };

  if (!can('roles.read')) {
    return (
      <PageLayout title="Gestion des rôles" subtitle="Accès refusé" icon={Shield}>
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
      title="Gestion des rôles"
      subtitle="Gérer les rôles et permissions de votre entreprise"
      icon={Shield}
      actions={
        can('roles.create') && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un rôle
          </Button>
        )
      }
    >
      {/* Liste des rôles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${role.color}20` }}
                >
                  {role.slug === 'owner' ? (
                    <Crown className="h-5 w-5" style={{ color: role.color }} />
                  ) : (
                    <Shield className="h-5 w-5" style={{ color: role.color }} />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{role.name}</h3>
                  {role.is_system && (
                    <Badge variant="secondary" className="mt-1">
                      Système
                    </Badge>
                  )}
                </div>
              </div>

              {!role.is_system && can('roles.update') && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(role)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {can('roles.delete') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRole(role);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {role.description || 'Aucune description'}
            </p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{role.user_count || 0} utilisateur(s)</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog de création */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouveau rôle</DialogTitle>
            <DialogDescription>
              Définissez les informations et les permissions du nouveau rôle.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du rôle *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Comptable, Commercial..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez les responsabilités de ce rôle..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Permissions</Label>
              <div className="space-y-4 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-sm mb-2 capitalize">{category}</h4>
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm.id}
                            checked={selectedPermissions.includes(perm.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPermissions([...selectedPermissions, perm.id]);
                              } else {
                                setSelectedPermissions(
                                  selectedPermissions.filter((id) => id !== perm.id)
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={perm.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            <span className="font-mono text-xs">{perm.key}</span>
                            {perm.description && (
                              <span className="text-muted-foreground ml-2">
                                - {perm.description}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate}>Créer le rôle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le rôle</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le rôle "{selectedRole?.name}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

// Wrapper avec RouteGuard
export function RolesManagementGuarded() {
  return (
    <RouteGuard permission="roles.read">
      <RolesManagement />
    </RouteGuard>
  );
}
