/**
 * Modal pour envoyer le lien de paiement au client
 * Avec aperçu email et options (copier, envoyer, ou les deux)
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2, Mail, Copy, CreditCard, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface SendPaymentLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  paymentUrl: string;
  paymentType: 'total' | 'deposit' | 'installments';
  amount: number;
  onSuccess?: () => void;
}

export default function SendPaymentLinkModal({
  open,
  onOpenChange,
  quote,
  paymentUrl,
  paymentType,
  amount,
  onSuccess,
}: SendPaymentLinkModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Pré-remplir l'email
  useEffect(() => {
    if (open && quote) {
      setEmail(quote.client_email || quote.email || "");
      setCustomMessage("");
      setLinkCopied(false);
    }
  }, [open, quote]);

  // Copier le lien dans le presse-papier
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setLinkCopied(true);
      toast({
        title: "✅ Lien copié !",
        description: "Le lien de paiement a été copié dans votre presse-papier",
      });
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  };

  // Envoyer l'email
  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "⚠️ Email invalide",
        description: "Veuillez saisir une adresse email valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-payment-link-email', {
        body: {
          quote_id: quote.id,
          payment_url: paymentUrl,
          payment_type: paymentType,
          amount: amount,
          client_email: email,
          client_name: quote.client_name,
          custom_message: customMessage,
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Email envoyé !",
        description: `Le lien de paiement a été envoyé à ${email}`,
        duration: 5000,
      });

      // Attendre un peu pour que le toast soit visible
      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 500);
    } catch (error: any) {
      console.error('Erreur envoi email:', error);
      toast({
        title: "❌ Erreur d'envoi",
        description: error.message || "Impossible d'envoyer l'email. Vous pouvez copier le lien manuellement.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Copier ET envoyer
  const handleCopyAndSend = async () => {
    await handleCopyLink();
    await handleSendEmail();
  };

  const paymentTypeLabel = 
    paymentType === 'deposit' ? 'Acompte' :
    paymentType === 'installments' ? 'Paiement en plusieurs fois' :
    'Paiement total';

  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer le lien de paiement
          </DialogTitle>
          <DialogDescription>
            Aperçu et envoi du lien de paiement à votre client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du paiement */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Devis</span>
                <span className="font-semibold">{quote.quote_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Client</span>
                <span className="font-semibold">{quote.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type de paiement</span>
                <span className="font-semibold">{paymentTypeLabel}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-base font-semibold">Montant</span>
                <span className="text-2xl font-bold text-primary">{formattedAmount}</span>
              </div>
            </div>
          </Card>

          {/* Lien de paiement */}
          <div className="space-y-2">
            <Label>Lien de paiement Stripe</Label>
            <div className="flex gap-2">
              <Input
                value={paymentUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant={linkCopied ? "default" : "outline"}
                size="icon"
                onClick={handleCopyLink}
                disabled={linkCopied}
              >
                {linkCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {linkCopied && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Lien copié dans le presse-papier
              </p>
            )}
          </div>

          {/* Email du client */}
          <div className="space-y-2">
            <Label htmlFor="email">Email du client *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
            />
          </div>

          {/* Message personnalisé */}
          <div className="space-y-2">
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Ajoutez un message personnel à votre client..."
              rows={3}
            />
          </div>

          {/* Aperçu de l'email */}
          <div className="space-y-2">
            <Label>Aperçu de l'email</Label>
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">💳 Votre lien de paiement</h3>
                </div>
                
                <p className="text-sm">
                  Bonjour <strong>{quote.client_name}</strong>,
                </p>
                
                <p className="text-sm">
                  Merci d'avoir signé le devis <strong>{quote.quote_number}</strong>. 
                  Vous pouvez maintenant procéder au paiement de <strong>{formattedAmount}</strong> ({paymentTypeLabel.toLowerCase()}).
                </p>

                {customMessage && (
                  <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border">
                    <p className="text-sm italic">{customMessage}</p>
                  </div>
                )}

                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-semibold">{paymentTypeLabel}</span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t">
                    <span className="font-bold">Montant</span>
                    <span className="font-bold text-primary">{formattedAmount}</span>
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <div className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold text-center">
                    💳 Payer maintenant
                  </div>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                  <p className="text-xs text-green-800 dark:text-green-200">
                    <strong>✓ Paiement 100% sécurisé</strong><br />
                    Vos informations bancaires sont protégées par Stripe.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Email envoyé par <strong>{quote.company_name || 'BTP Smart Pro'}</strong>
                </p>
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              disabled={loading || linkCopied}
              className="gap-2"
            >
              {linkCopied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier le lien
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSendEmail}
              disabled={loading || !email}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer par email
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
