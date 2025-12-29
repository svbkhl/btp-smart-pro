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
import { toast } from '@/components/ui/use-toast';
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>(defaultRole);
  const [success, setSuccess] = useState(false);

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
      // Vérifier que l'utilisateur est connecté
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast({
          title: 'Erreur',
          description: 'Vous devez être connecté pour envoyer une invitation',
          variant: 'destructive',
        });
        return;
      }

      const emailToSend = email.trim().toLowerCase();
      // Envoyer email + rôle + companyId
      const requestBody = { 
        email: emailToSend,
        role: role,
        companyId: companyId
      };
      
      console.log("📤 Sending invitation request - Body:", JSON.stringify(requestBody));
      console.log("🔐 User session:", session.session?.user?.email);

      // Utiliser supabase.functions.invoke qui gère automatiquement l'authentification
      // et envoie correctement le body JSON
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: requestBody, // { email: "..." } - supabase le sérialise automatiquement
      });

      console.log("📥 Response received:", { data, error });

      if (error) {
        console.error("❌ Supabase function error:", error);
        // Extraire le message d'erreur
        let errorMessage = error.message || 'Impossible d\'envoyer l\'invitation';
        
        // Si l'erreur contient un body JSON avec un message d'erreur
        if (error.context?.body) {
          try {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body;
            console.log("📋 Error body:", errorBody);
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
            if (errorBody?.details) {
              errorMessage += ` - ${errorBody.details}`;
            }
          } catch (e) {
            console.error("❌ Error parsing error body:", e);
          }
        }
        
        toast({
          title: 'Erreur',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      // Vérifier le format de réponse
      // Format attendu : { success: boolean, message: string, ... }
      
      // Si l'utilisateur existe déjà (success: false avec message approprié)
      if (data?.success === false && data?.message) {
        toast({
          title: 'Utilisateur existant',
          description: data.message,
          variant: 'default', // Pas destructif, juste informatif
        });
        setEmail('');
        setOpen(false);
        onSuccess?.(); // On considère que c'est un succès (l'utilisateur existe déjà)
        return;
      }

      // Succès - invitation envoyée
      if (data?.success === true) {
        setSuccess(true);
        toast({
          title: 'Invitation envoyée avec succès !',
          description: data?.message || `Une invitation a été envoyée à ${emailToSend}`,
        });
        
        // Réinitialiser après 2 secondes pour permettre de voir le message
        setTimeout(() => {
          setEmail('');
          setSuccess(false);
          setOpen(false);
          onSuccess?.();
        }, 2000);
        return;
      }

      // Vérifier si data contient une erreur (ancien format)
      if (data?.error) {
        console.error("❌ Function returned error:", data.error);
        toast({
          title: 'Erreur',
          description: data.error + (data.details ? ` - ${data.details}` : ''),
          variant: 'destructive',
        });
        return;
      }

      // Réponse inattendue
      console.warn("⚠️ Unexpected response format:", data);
      toast({
        title: 'Réponse inattendue',
        description: 'Le serveur a retourné une réponse inattendue. Veuillez réessayer.',
        variant: 'destructive',
      });

    } catch (e: any) {
      console.error('❌ Error sending invitation:', e);
      toast({
        title: 'Erreur',
        description: e.message || 'Erreur inconnue',
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
            <Button 
              type="submit" 
              disabled={loading || success} 
              className={`gap-2 rounded-xl ${success ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : success ? (
                <>
                  <Mail className="h-4 w-4" />
                  Invitation envoyée avec succès !
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


