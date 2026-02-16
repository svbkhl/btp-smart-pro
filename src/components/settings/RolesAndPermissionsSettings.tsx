import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Shield, Loader2, Save, User, Crown, Briefcase } from "lucide-react";
import { useAllUserRoles, useUpdateUserRole, useCurrentUserRole, UserRole } from "@/hooks/useUserRoles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const roleLabels: Record<UserRole, string> = {
  member: "Membre",
  admin: "Administrateur",
};

const roleIcons: Record<UserRole, typeof User> = {
  member: User,
  admin: Crown,
};

const roleDescriptions: Record<UserRole, string> = {
  member: "Accès limité aux fonctionnalités de base",
  admin: "Accès complet à toutes les fonctionnalités, y compris la gestion des utilisateurs et des entreprises",
};

const roleColors: Record<UserRole, string> = {
  member: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  admin: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
};

export const RolesAndPermissionsSettings = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: currentUserRole, isLoading: isLoadingRole } = useCurrentUserRole();
  const { data: allUsers, isLoading, error } = useAllUserRoles();
  const updateRole = useUpdateUserRole();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});

  // Vérifier si l'utilisateur peut gérer les rôles
  // Utiliser isAdmin de useAuth OU le rôle de la table user_roles
  const userRole = currentUserRole?.role;
  const canManageRoles = isAdmin || userRole === "admin";

  // Afficher un loader pendant le chargement du rôle
  if (isLoadingRole) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </GlassCard>
    );
  }

  // Si l'utilisateur n'est pas admin/dirigeant, ne rien afficher (l'onglet ne devrait pas être visible)
  if (!canManageRoles) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Accès restreint</h3>
          <p className="text-muted-foreground">
            Seuls les administrateurs peuvent gérer les rôles et permissions.
          </p>
        </div>
      </GlassCard>
    );
  }

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12">
          <p className="text-destructive">Erreur lors du chargement des rôles: {error.message}</p>
        </div>
      </GlassCard>
    );
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setSelectedRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSave = async (userId: string, newRole: UserRole) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole });
      toast({
        title: "Rôle mis à jour",
        description: `Le rôle a été mis à jour avec succès`,
      });
      setSelectedRoles((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Rôles et Permissions</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Configurez les rôles des utilisateurs et leurs permissions d'accès
        </p>

        {/* Informations sur les rôles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(["member", "admin"] as UserRole[]).map((role) => {
            const Icon = roleIcons[role];
            return (
              <div
                key={role}
                className={`p-4 rounded-xl border ${roleColors[role]} space-y-2`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <h3 className="font-semibold">{roleLabels[role]}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
              </div>
            );
          })}
        </div>

        {/* Liste des utilisateurs */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Utilisateurs</h3>
          
          {!allUsers || allUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allUsers.map((userRole) => {
                const currentRole = selectedRoles[userRole.user_id] || userRole.role;
                const Icon = roleIcons[currentRole];
                const isCurrentUser = userRole.user_id === user?.id;

                return (
                  <div
                    key={userRole.id}
                    className="p-4 rounded-xl border border-border/50 bg-transparent backdrop-blur-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {userRole.name || userRole.email || "Utilisateur"}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">
                              Vous
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {userRole.email}
                        </p>
                      </div>
                      <Badge className={roleColors[currentRole]}>
                        {roleLabels[currentRole]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={currentRole}
                        onValueChange={(value) => handleRoleChange(userRole.user_id, value as UserRole)}
                        disabled={isCurrentUser && currentUserRole?.role !== "admin"}
                      >
                        <SelectTrigger className="w-[140px] rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membre</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>

                      {selectedRoles[userRole.user_id] && selectedRoles[userRole.user_id] !== userRole.role && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(userRole.user_id, selectedRoles[userRole.user_id])}
                          disabled={updateRole.isPending}
                          className="gap-2 rounded-xl"
                        >
                          {updateRole.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Enregistrer
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

