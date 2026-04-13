/**
 * Component: InviteUserDialogRBAC
 * Description: Dialog pour inviter un utilisateur avec sélection du rôle RBAC
 * Version améliorée avec support du système de rôles RBAC
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, UserPlus, Shield, Crown, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { AuditLogHelpers } from '@/services/auditLogService';

interface InviteUserDialogRBACProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const ROLE_ICONS: Record<string, any> = {
  owner: Crown,
  admin: Shield,
  rh: Users,
  employee: User,
};

export const InviteUserDialogRBAC = ({
  trigger,
  onSuccess,
}: InviteUserDialogRBACProps) => {
  const { user, currentCompanyId } = useAuth();
  const { can, isOwner, isAdmin } = usePermissions();
  const { roles, isLoading: rolesLoading } = useRoles();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Dirigeant et administrateur peuvent toujours inviter ; sinon permission employees.access
  const canInvite = can('employees.access') || isOwner || isAdmin;

  if (!canInvite) {
    return null;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation email
    if (!email || email.trim() === '' || !email.includes('@') || !email.includes('.')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un email valide',
        variant: 'destructive',
      });
      return;
    }

    // Validation rôle
    if (!selectedRoleId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un rôle',
        variant: 'destructive',
      });
      return;
    }

    // Validation company
    if (!currentCompanyId) {
      toast({
        title: 'Erreur',
        description: 'Aucune entreprise sélectionnée',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('📤 [InviteUserDialogRBAC] Sending invitation:', {
        email,
        role_id: selectedRoleId,
        company_id: currentCompanyId,
      });

      // Récupérer le rôle sélectionné pour le log
      const selectedRole = roles.find(r => r.id === selectedRoleId);

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: email.trim().toLowerCase(),
          role_id: selectedRoleId,
          company_id: currentCompanyId,
        },
      });

      if (error) {
        console.error('❌ [InviteUserDialogRBAC] Error:', error);
        throw error;
      }

      console.log('✅ [InviteUserDialogRBAC] Invitation sent successfully');

      // Logger dans les audit logs
      if (user && selectedRole) {
        await AuditLogHelpers.logUserInvited(
          email.trim().toLowerCase(),
          selectedRole.name,
          user.id
        );
      }

      toast({
        title: 'Invitation envoyée',
        description: `Un email d'invitation a été envoyé à ${email}`,
      });

      // Reset et fermer
      setEmail('');
      setSelectedRoleId('');
      setOpen(false);

      // Callback de succès
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('❌ [InviteUserDialogRBAC] Unexpected error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer l\'invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter un employé
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Inviter un employé
          </DialogTitle>
          <DialogDescription>
            Envoyez une invitation par email. L&apos;utilisateur pourra créer son compte et rejoindre votre entreprise sans saisir de carte bancaire (essai géré avec votre interlocuteur commercial).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite}>
          <div className="grid gap-4 py-4">
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">
                Adresse email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="employe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Rôle */}
            <div className="grid gap-2">
              <Label htmlFor="role">
                Rôle attribué <span className="text-destructive">*</span>
              </Label>
              
              {rolesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Chargement des rôles...
                  </span>
                </div>
              ) : (
                <Select
                  value={selectedRoleId}
                  onValueChange={setSelectedRoleId}
                  disabled={loading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((role) => role.slug === 'owner' || role.slug === 'employee')
                      .map((role) => {
                        const Icon = ROLE_ICONS[role.slug] || User;
                        return (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: role.color }} />
                              <span>{role.name}</span>
                              {role.is_system && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Système
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              )}

              {/* Description du rôle sélectionné */}
              {selectedRoleId && (
                <p className="text-xs text-muted-foreground mt-1">
                  {roles.find(r => r.id === selectedRoleId)?.description || ''}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedRoleId}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer l'invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

