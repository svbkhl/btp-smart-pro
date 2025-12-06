/**
 * Invite User Dialog
 * 
 * Composant pour inviter un utilisateur à rejoindre une entreprise
 * Utilisé par l'admin pour inviter des membres
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
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>(defaultRole);

  // Vérifier que companyId est chargé avant de permettre l'ouverture du dialog
  const isCompanyIdReady = companyId && companyId.trim() !== '';

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

    setLoading(true);

    try {
      // Appeler UNIQUEMENT l'Edge Function avec l'email
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email: email.trim().toLowerCase() },
      });

      if (error) {
        // Extraire le message d'erreur
        let errorMessage = error.message || 'Impossible d\'envoyer l\'invitation';
        
        // Si l'erreur contient un body JSON avec un message d'erreur
        if (error.context?.body) {
          try {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body;
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            // Ignorer l'erreur de parsing
          }
        }
        
        throw new Error(errorMessage);
      }

      // Vérifier la réponse
      if (data?.success === true || data?.error) {
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Succès
        toast({
          title: '✅ Invitation envoyée avec succès',
          description: `Une invitation a été envoyée à ${email}`,
          duration: 5000,
        });

        setEmail('');
        setOpen(false);
        onSuccess?.();
      } else {
        throw new Error('Réponse inattendue de la fonction');
      }
    } catch (error: any) {
      console.error('❌ Error sending invitation:', error);
      
      // Toast d'erreur avec le message exact
      toast({
        title: '❌ Erreur',
        description: error.message || 'Impossible d\'envoyer l\'invitation. Veuillez réessayer.',
        variant: 'destructive',
        duration: 5000,
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
                <SelectItem value="owner">Propriétaire (Owner)</SelectItem>
                <SelectItem value="admin">Administrateur (Admin)</SelectItem>
                <SelectItem value="member">Membre (Member)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === 'owner' && 'Le propriétaire aura tous les droits sur l\'entreprise'}
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


