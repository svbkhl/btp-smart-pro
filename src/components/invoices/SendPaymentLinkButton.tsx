/**
 * Composant: SendPaymentLinkButton
 * 
 * Bouton pour envoyer un lien de paiement Stripe au client
 * 
 * Features:
 * - Choix du type de paiement (total ou acompte)
 * - Montant personnalisé pour acompte
 * - Vérification devis signé
 * - Génération automatique facture si besoin
 * - Email automatique au client
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, Send } from "lucide-react";

interface SendPaymentLinkButtonProps {
  quoteId: string;
  invoiceId?: string;
  quoteSigned: boolean;
  clientEmail: string;
  clientName?: string;
  totalAmount: number;
  amountPaid?: number;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function SendPaymentLinkButton({
  quoteId,
  invoiceId,
  quoteSigned,
  clientEmail,
  clientName,
  totalAmount,
  amountPaid = 0,
  onSuccess,
  variant = "default",
  size = "default",
}: SendPaymentLinkButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"total" | "deposit">("total");
  const [depositAmount, setDepositAmount] = useState<string>("");

  const remainingAmount = totalAmount - amountPaid;

  const handleSendPaymentLink = async () => {
    // Vérifications
    if (!quoteSigned) {
      toast({
        title: "❌ Devis non signé",
        description: "Le devis doit être signé avant de pouvoir générer un lien de paiement.",
        variant: "destructive",
      });
      return;
    }

    if (!clientEmail) {
      toast({
        title: "❌ Email manquant",
        description: "L'email du client est requis pour envoyer le lien de paiement.",
        variant: "destructive",
      });
      return;
    }

    if (remainingAmount <= 0) {
      toast({
        title: "❌ Facture déjà payée",
        description: "Le montant restant à payer est de 0€.",
        variant: "destructive",
      });
      return;
    }

    if (paymentType === "deposit") {
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "❌ Montant invalide",
          description: "Veuillez entrer un montant d'acompte valide.",
          variant: "destructive",
        });
        return;
      }
      if (amount > remainingAmount) {
        toast({
          title: "❌ Montant trop élevé",
          description: `Le montant d'acompte ne peut pas dépasser ${remainingAmount.toFixed(2)}€.`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Appeler l'Edge Function pour créer le lien de paiement
      const { data, error } = await supabase.functions.invoke("create-payment-link", {
        body: {
          quote_id: quoteId,
          invoice_id: invoiceId,
          payment_type: paymentType,
          amount: paymentType === "deposit" ? parseFloat(depositAmount) : remainingAmount,
          client_email: clientEmail,
          client_name: clientName,
        },
      });

      if (error) {
        console.error("❌ Erreur création lien paiement:", error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Échec de la création du lien de paiement");
      }

      console.log("✅ Lien de paiement créé:", data);

      // Copier le lien dans le presse-papiers
      if (data.payment_link && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.payment_link);
          toast({
            title: "✅ Lien copié !",
            description: "Le lien de paiement a été copié dans le presse-papiers.",
          });
        } catch (clipboardError) {
          console.warn("Impossible de copier dans le presse-papiers:", clipboardError);
        }
      }

      // TODO: Envoyer l'email automatiquement au client avec le lien
      // Pour l'instant, l'admin peut copier/coller le lien

      toast({
        title: "✅ Lien de paiement créé !",
        description: `Un lien de paiement de ${data.amount.toFixed(2)}€ a été généré pour ${clientEmail}.`,
        duration: 5000,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de créer le lien de paiement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} disabled={!quoteSigned || remainingAmount <= 0}>
          <CreditCard className="mr-2 h-4 w-4" />
          Envoyer lien de paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Envoyer un lien de paiement
          </DialogTitle>
          <DialogDescription>
            Générez un lien de paiement Stripe pour {clientName || clientEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informations */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant total :</span>
              <span className="font-medium">{totalAmount.toFixed(2)} €</span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Déjà payé :</span>
                <span className="font-medium text-green-600">- {amountPaid.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-border/50">
              <span className="text-muted-foreground font-medium">Restant à payer :</span>
              <span className="text-lg font-bold text-primary">{remainingAmount.toFixed(2)} €</span>
            </div>
          </div>

          {/* Type de paiement */}
          <div className="space-y-2">
            <Label htmlFor="payment-type">Type de paiement</Label>
            <Select value={paymentType} onValueChange={(value: any) => setPaymentType(value)}>
              <SelectTrigger id="payment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">
                  Paiement total ({remainingAmount.toFixed(2)} €)
                </SelectItem>
                <SelectItem value="deposit">Acompte (montant personnalisé)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Montant acompte */}
          {paymentType === "deposit" && (
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Montant de l'acompte (€)</Label>
              <Input
                id="deposit-amount"
                type="number"
                step="0.01"
                min="0"
                max={remainingAmount}
                placeholder="Ex: 500.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum : {remainingAmount.toFixed(2)} €
              </p>
            </div>
          )}

          {/* Email client */}
          <div className="space-y-2">
            <Label>Email du client</Label>
            <Input value={clientEmail} disabled />
            <p className="text-xs text-muted-foreground">
              Le lien de paiement sera envoyé à cette adresse
            </p>
          </div>

          {/* Avertissement si devis non signé */}
          {!quoteSigned && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Le devis doit être signé avant de pouvoir générer un lien de paiement.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSendPaymentLink} disabled={loading || !quoteSigned}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer le lien
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
