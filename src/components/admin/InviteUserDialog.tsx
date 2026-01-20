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
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const InviteUserDialog = ({
  companyId,
  companyName,
  trigger,
  onSuccess,
}: InviteUserDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  // Toujours inviter en tant que dirigeant (owner)
  const role: 'owner' = 'owner';

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

    // Vérifier que l'utilisateur est connecté
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour envoyer une invitation',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const emailToSend = email.trim().toLowerCase();

    // Vérifier que companyId est défini
    if (!companyId || companyId.trim() === '') {
      toast({
        title: 'Erreur',
        description: 'L\'ID de l\'entreprise n\'est pas défini. Veuillez réessayer.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Envoyer email + rôle + company_id (format attendu par create-company-invite)
    const requestBody = { 
      company_id: companyId.trim(),
      email: emailToSend,
      role: role, // 'admin' ou 'member'
    };
    
    console.log("📤 Sending invitation request - Body:", JSON.stringify(requestBody));
    console.log("🔐 User session:", session.session?.user?.email);
    console.log("🏢 Company ID:", companyId);

    // Utiliser fetch directement pour avoir plus de contrôle sur la gestion d'erreur
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const accessToken = session.session?.access_token;

    if (!accessToken) {
      toast({
        title: 'Erreur',
        description: 'Session expirée. Veuillez vous reconnecter.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!supabaseUrl) {
      toast({
        title: 'Erreur',
        description: 'Configuration manquante. Veuillez contacter le support.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/create-company-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify(requestBody),
        });

        console.log("📥 Response status:", response.status);
        console.log("📥 Response ok:", response.ok);

        // Lire le corps de la réponse
        const responseText = await response.text();
        console.log("📥 Response text:", responseText);

        let responseData: any = null;
        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          console.error("❌ Error parsing response:", e);
        }

        console.log("📥 Response data:", responseData);

        // Si la réponse n'est pas OK, extraire l'erreur
        if (!response.ok) {
          const errorMessage = responseData?.message || responseData?.error || `Erreur ${response.status}: ${response.statusText}`;
          
          // Gérer les erreurs spécifiques
          let userMessage = errorMessage;
          if (errorMessage.includes('Missing required field: company_id') || errorMessage.includes('company_id')) {
            userMessage = 'L\'ID de l\'entreprise est manquant. Veuillez réessayer.';
          } else if (errorMessage.includes('Missing required fields')) {
            userMessage = 'Champs manquants: vérifiez que l\'entreprise, l\'email et le rôle sont définis';
          } else if (errorMessage.includes('Invalid role')) {
            userMessage = 'Rôle invalide. Le rôle doit être "admin" ou "member"';
          } else if (errorMessage.includes('Company not found')) {
            userMessage = 'Entreprise non trouvée. Vérifiez que vous avez sélectionné une entreprise valide';
          } else if (errorMessage.includes('already pending')) {
            userMessage = 'Une invitation est déjà en attente pour cet email';
          } else if (errorMessage.includes('already a member')) {
            userMessage = 'Cet utilisateur est déjà membre de cette entreprise';
          } else if (errorMessage.includes('Unauthorized') || response.status === 401) {
            userMessage = 'Non autorisé. Veuillez vous reconnecter.';
          } else if (errorMessage.includes('Invalid JSON') || errorMessage.includes('parsing')) {
            userMessage = 'Erreur de format de données. Veuillez réessayer.';
          } else if (response.status === 400) {
            userMessage = responseData?.message || responseData?.error || 'Requête invalide. Vérifiez que tous les champs sont correctement remplis.';
          } else if (response.status === 403) {
            userMessage = 'Vous n\'avez pas les permissions nécessaires pour inviter des utilisateurs.';
          }

          toast({
            title: 'Erreur',
            description: userMessage,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Traiter la réponse de succès
        // Format de réponse attendu : { success: true, message: string, invite_id: string, expires_at: string }
        if (responseData?.success === true) {
          setSuccess(true);
          toast({
            title: 'Invitation envoyée avec succès !',
            description: responseData?.message || `Une invitation a été envoyée à ${emailToSend}`,
          });
          
          // Réinitialiser après 2 secondes pour permettre de voir le message
          setTimeout(() => {
            setEmail('');
            setSuccess(false);
            setOpen(false);
            onSuccess?.();
          }, 2000);
          setLoading(false);
          return;
        }

        // Vérifier si responseData contient une erreur (même si status est OK)
        if (responseData?.error) {
          console.error("❌ Function returned error:", responseData.error);
          toast({
            title: 'Erreur',
            description: responseData.error + (responseData.details ? ` - ${responseData.details}` : ''),
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Réponse inattendue
        console.warn("⚠️ Unexpected response format:", responseData);
        toast({
          title: 'Réponse inattendue',
          description: 'Le serveur a retourné une réponse inattendue. Veuillez réessayer.',
          variant: 'destructive',
        });
        setLoading(false);
    } catch (e: any) {
      console.error('❌ Error sending invitation:', e);
      toast({
        title: 'Erreur',
        description: e.message || 'Erreur inconnue lors de l\'envoi de l\'invitation',
        variant: 'destructive',
      });
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
            Inviter un dirigeant
          </DialogTitle>
          <DialogDescription>
            Inviter un dirigeant pour {companyName}. Le dirigeant pourra ensuite inviter ses employés.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email du dirigeant *</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dirigeant@example.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Une invitation sera envoyée à cette adresse pour rejoindre l'entreprise en tant que dirigeant.
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


