/**
 * Invite User Dialog
 * 
 * Composant pour inviter un utilisateur (dirigeant ou employé) à rejoindre une entreprise
 * Utilisé par l'admin pour inviter des dirigeants
 * Utilisé par les dirigeants pour inviter des employés
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
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface InviteUserDialogProps {
  companyId: string;
  companyName: string;
  defaultRole?: 'owner' | 'admin' | 'member';
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const InviteUserDialog = ({
  companyId,
  companyName,
  defaultRole = 'member',
  trigger,
  onSuccess,
}: InviteUserDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>(defaultRole);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un email valide',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          company_id: companyId,
          role,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Invitation envoyée',
        description: `Une invitation a été envoyée à ${email}`,
      });

      setEmail('');
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
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
          <Button className="gap-2 rounded-xl">
            <UserPlus className="h-4 w-4" />
            Inviter un utilisateur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Inviter un utilisateur
          </DialogTitle>
          <DialogDescription>
            Envoyer une invitation à {companyName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="utilisateur@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Rôle *</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Dirigeant (Owner)</SelectItem>
                <SelectItem value="admin">Administrateur (Admin)</SelectItem>
                <SelectItem value="member">Membre (Employé)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === 'owner' && 'Le dirigeant aura tous les droits sur l\'entreprise'}
              {role === 'admin' && 'L\'administrateur pourra gérer les utilisateurs et les paramètres'}
              {role === 'member' && 'Le membre aura un accès standard à l\'application'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 rounded-xl">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
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

