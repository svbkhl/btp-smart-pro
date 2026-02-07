/**
 * Contact Form Component
 * 
 * Formulaire de contact pour les visiteurs non démarchés
 * Permet de demander un essai gratuit ou de contacter l'admin
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, Phone, Building2, User, MessageSquare, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRequestType?: 'essai_gratuit' | 'contact' | 'information';
}

export const ContactForm = ({
  open,
  onOpenChange,
  defaultRequestType = 'essai_gratuit',
}: ContactFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    entreprise: '',
    message: '',
    trial_requested: defaultRequestType === 'essai_gratuit',
    request_type: defaultRequestType,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.nom || !formData.prenom || !formData.email) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir au moins le nom, prénom et email',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email.includes('@')) {
      toast({
        title: 'Email invalide',
        description: 'Veuillez entrer un email valide',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Créer la demande via Edge Function (contourne RLS, pas d'auth requise)
      const { data, error: createError } = await supabase.functions.invoke('create-contact-request', {
        body: {
          nom: formData.nom.trim(),
          prenom: formData.prenom.trim(),
          email: formData.email.trim(),
          telephone: formData.telephone?.trim() || null,
          entreprise: formData.entreprise?.trim() || null,
          message: formData.message?.trim() || null,
          request_type: formData.request_type,
          trial_requested: formData.trial_requested,
        },
      });

      if (createError) {
        throw createError;
      }

      const responseData = data as { success?: boolean; error?: string; details?: string } | null;
      if (responseData?.error) {
        throw new Error(responseData.details || responseData.error);
      }
      if (responseData && responseData.success === false) {
        throw new Error(responseData.error || 'La demande n\'a pas pu être créée');
      }

      toast({
        title: 'Demande envoyée !',
        description: formData.trial_requested
          ? 'Votre demande d\'essai gratuit a été envoyée. Nous vous contacterons rapidement.'
          : 'Votre message a été envoyé. Nous vous répondrons rapidement.',
      });

      // Réinitialiser le formulaire
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        entreprise: '',
        message: '',
        trial_requested: defaultRequestType === 'essai_gratuit',
        request_type: defaultRequestType,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer votre demande. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {formData.trial_requested ? 'Demander un essai gratuit' : 'Nous contacter'}
          </DialogTitle>
          <DialogDescription>
            {formData.trial_requested
              ? 'Remplissez le formulaire ci-dessous pour demander un essai gratuit de 30 jours. Nous vous contacterons rapidement.'
              : 'Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Prénom *
              </Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Jean"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nom" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Nom *
              </Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Dupont"
                required
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jean.dupont@example.com"
              required
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telephone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Téléphone
              </Label>
              <Input
                id="telephone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entreprise" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Entreprise
              </Label>
              <Input
                id="entreprise"
                value={formData.entreprise}
                onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                placeholder="Nom de votre entreprise"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Message
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Dites-nous en plus sur vos besoins..."
              rows={4}
              className="rounded-xl resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <Checkbox
              id="trial_requested"
              checked={formData.trial_requested}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, trial_requested: checked === true })
              }
            />
            <Label
              htmlFor="trial_requested"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Je souhaite bénéficier d'un essai gratuit de 30 jours
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                  Envoyer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};















