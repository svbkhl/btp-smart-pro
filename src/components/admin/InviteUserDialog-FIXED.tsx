/**
 * Invite User Dialog - VERSION CORRIGÉE
 * 
 * Composant pour inviter un utilisateur à rejoindre une entreprise
 * Version corrigée avec tous les champs requis pour send-invitation
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

    // Empêcher l'appel si company_id ou email est vide
    if (!isCompanyIdReady) {
      toast({
        title: 'Erreur',
        description: 'L\'identifiant de l\'entreprise n\'est pas encore chargé. Veuillez patienter.',
        variant: 'destructive',
      });
      console.error('❌ [InviteUserDialog] companyId is not ready:', { companyId, companyName });
      return;
    }

    // Validation email
    if (!email || email.trim() === '' || !email.includes('@') || !email.includes('.')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un email valide',
        variant: 'destructive',
      });
      return;
    }

    // Vérifier que l'utilisateur est connecté pour obtenir invited_by
    if (!user || !user.id) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour envoyer une invitation',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Préparer le body avec TOUS les champs requis par send-invitation
      const requestBody = {
        email: email.trim().toLowerCase(),
        company_id: companyId.trim(),
        role: (role || 'member').trim(),
        invited_by: user.id, // CRITIQUE: Doit correspondre à auth.uid()
      };

      // Logger proprement le body envoyé avant l'appel
      console.log('🟢 [InviteUserDialog] Sending invitation request');
      console.log('🟢 [InviteUserDialog] Request body:', { 
        email: requestBody.email, 
        company_id: requestBody.company_id, 
        role: requestBody.role,
        invited_by: requestBody.invited_by 
      });

      // Vérifier que la session est active pour obtenir le token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      console.log('🟢 [InviteUserDialog] Session active, calling function...');

      // Appeler la fonction avec le body correctement formaté
      // IMPORTANT: Supabase sérialise automatiquement le body en JSON
      // Ne PAS utiliser JSON.stringify() ici, Supabase le fait automatiquement
      // Supabase ajoute aussi automatiquement les headers Authorization et Content-Type
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: requestBody,
      });

      // Afficher la réponse JSON côté front
      console.log('🟢 [InviteUserDialog] Response received:', { 
        data: data ? JSON.stringify(data, null, 2) : null, 
        error: error ? JSON.stringify(error, null, 2) : null 
      });

      if (error) {
        console.error('❌ [InviteUserDialog] Error from function:', error);
        
        // Extraire le message d'erreur détaillé
        let errorMessage = 'Erreur lors de l\'appel de la fonction';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.context?.msg) {
          errorMessage = error.context.msg;
        }
        
        throw new Error(errorMessage);
      }

      // Vérifier la réponse
      if (!data) {
        throw new Error('Aucune réponse de la fonction');
      }

      if (!data.success) {
        // Construire un message d'erreur détaillé
        let errorMsg = 'La fonction n\'a pas retourné de succès';
        
        if (data.error) {
          errorMsg = data.error;
          if (data.details) {
            errorMsg += `: ${data.details}`;
          }
          if (data.suggestion) {
            errorMsg += ` (${data.suggestion})`;
          }
        } else if (data.missing) {
          errorMsg = `Champs manquants: ${Array.isArray(data.missing) ? data.missing.join(', ') : data.missing}`;
        }
        
        console.error('❌ [InviteUserDialog] Function returned error:', data);
        throw new Error(errorMsg);
      }

      console.log('✅ [InviteUserDialog] Invitation sent successfully:', data);

      toast({
        title: 'Invitation envoyée',
        description: `Une invitation a été envoyée à ${email}`,
      });

      setEmail('');
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ [InviteUserDialog] Error sending invitation:', error);
      
      // Message d'erreur plus clair
      let errorMessage = 'Impossible d\'envoyer l\'invitation';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
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




