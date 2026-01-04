/**
 * Dialog pour créer un lien de paiement Stripe
 * Supporte : paiement total, acompte, et en plusieurs fois
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SendPaymentLinkModal from "./SendPaymentLinkModal";

interface CreatePaymentLinkDialogProps {
  quote: any;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

type PaymentType = 'total' | 'deposit' | 'installments';

export default function CreatePaymentLinkDialog({
  quote,
  onSuccess,
  trigger,
}: CreatePaymentLinkDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Type de paiement
  const [paymentType, setPaymentType] = useState<PaymentType>('total');
  
  // Modal d'envoi du lien
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [createdPaymentUrl, setCreatedPaymentUrl] = useState('');
  const [createdAmount, setCreatedAmount] = useState(0);
  
  // Pour acompte
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositPercentage, setDepositPercentage] = useState<number>(30);
  const [usePercentage, setUsePercentage] = useState(true);
  
  // Pour installments
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);

  const totalAmount = quote.estimated_cost || quote.total_ttc || 0;

  const calculateDepositAmount = () => {
    if (usePercentage) {
      return (totalAmount * depositPercentage) / 100;
    }
    return parseFloat(depositAmount) || 0;
  };

  const calculateInstallmentAmount = () => {
    return totalAmount / installmentsCount;
  };

  const handleCreatePaymentLink = async () => {
    if (!quote.signed) {
      toast({
        title: "⚠️ Devis non signé",
        description: "Le devis doit être signé avant de créer un lien de paiement",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let requestBody: any = {
        quote_id: quote.id,
        payment_type: paymentType,
      };

      // Ajouter les paramètres selon le type
      if (paymentType === 'deposit') {
        const amount = calculateDepositAmount();
        if (amount <= 0 || amount > totalAmount) {
          throw new Error("Montant d'acompte invalide");
        }
        requestBody.deposit_amount = amount;
      } else if (paymentType === 'installments') {
        if (installmentsCount < 2 || installmentsCount > 12) {
          throw new Error("Le nombre d'échéances doit être entre 2 et 12");
        }
        requestBody.installments_count = installmentsCount;
      }

      console.log('📤 Création lien de paiement:', requestBody);

      // Appeler l'Edge Function appropriée
      const functionName = paymentType === 'installments' 
        ? 'create-payment-link-v2' 
        : 'create-payment-link';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody,
      });

      if (error) throw error;

      if (!data.success || !data.payment_url) {
        throw new Error(data.error || 'Impossible de créer le lien de paiement');
      }

      console.log('✅ Lien créé:', data.payment_url);

      // Stocker les infos et ouvrir le modal d'envoi
      setCreatedPaymentUrl(data.payment_url);
      setCreatedAmount(paymentType === 'deposit' ? calculateDepositAmount() : totalAmount);
      
      // Fermer le dialog de création
      setOpen(false);
      
      // Ouvrir le modal d'envoi après un court délai
      setTimeout(() => {
        setSendModalOpen(true);
      }, 300);
    } catch (error: any) {
      console.error('Erreur création lien paiement:', error);
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
        {trigger || (
          <Button className="gap-2">
            <CreditCard className="h-4 w-4" />
            Créer lien de paiement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Créer un lien de paiement Stripe
          </DialogTitle>
          <DialogDescription>
            Choisissez le type de paiement et générez un lien sécurisé pour votre client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations devis */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Devis</span>
              <span className="font-medium">{quote.quote_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Client</span>
              <span className="font-medium">{quote.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Montant total TTC</span>
              <span className="text-lg font-bold text-primary">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(totalAmount)}
              </span>
            </div>
          </div>

          {/* Vérification signature */}
          {!quote.signed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ Ce devis doit être signé avant de créer un lien de paiement
              </AlertDescription>
            </Alert>
          )}

          {/* Type de paiement */}
          <div className="space-y-3">
            <Label>Type de paiement</Label>
            <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
              {/* Paiement total */}
              <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="total" id="total" />
                <div className="flex-1">
                  <Label htmlFor="total" className="cursor-pointer font-medium">
                    💰 Paiement total
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Le client paie la totalité : {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(totalAmount)}
                  </p>
                </div>
              </div>

              {/* Acompte */}
              <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="deposit" id="deposit" />
                <div className="flex-1">
                  <Label htmlFor="deposit" className="cursor-pointer font-medium">
                    💵 Acompte
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Le client paie un acompte, le solde reste dû
                  </p>
                  
                  {paymentType === 'deposit' && (
                    <div className="space-y-3 mt-3">
                      <RadioGroup 
                        value={usePercentage ? 'percentage' : 'amount'} 
                        onValueChange={(v) => setUsePercentage(v === 'percentage')}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage" className="cursor-pointer flex items-center gap-2">
                            Pourcentage
                          </Label>
                        </div>
                        {usePercentage && (
                          <div className="ml-6">
                            <Input
                              type="number"
                              min="1"
                              max="99"
                              value={depositPercentage}
                              onChange={(e) => setDepositPercentage(parseInt(e.target.value) || 30)}
                              className="w-32"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              = {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'EUR',
                              }).format(calculateDepositAmount())}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="amount" id="amount" />
                          <Label htmlFor="amount" className="cursor-pointer">
                            Montant fixe
                          </Label>
                        </div>
                        {!usePercentage && (
                          <div className="ml-6">
                            <Input
                              type="number"
                              min="1"
                              max={totalAmount}
                              step="0.01"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              placeholder="2000"
                              className="w-40"
                            />
                          </div>
                        )}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </div>

              {/* Paiement en plusieurs fois */}
              <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="installments" id="installments" />
                <div className="flex-1">
                  <Label htmlFor="installments" className="cursor-pointer font-medium">
                    📅 Paiement en plusieurs fois
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Le montant total est divisé en échéances
                  </p>
                  
                  {paymentType === 'installments' && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <Label htmlFor="installments-count" className="text-sm">
                          Nombre d'échéances (2-12)
                        </Label>
                        <Select
                          value={installmentsCount.toString()}
                          onValueChange={(v) => setInstallmentsCount(parseInt(v))}
                        >
                          <SelectTrigger className="w-32 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}x
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Montant par échéance
                        </p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(calculateInstallmentAmount())}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          ✓ Les échéances suivantes seront envoyées automatiquement
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreatePaymentLink}
              disabled={loading || !quote.signed}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Créer le lien
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modal d'envoi du lien (s'ouvre après création) */}
      <SendPaymentLinkModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        quote={quote}
        paymentUrl={createdPaymentUrl}
        paymentType={paymentType}
        amount={createdAmount}
        onSuccess={() => {
          if (onSuccess) onSuccess();
        }}
      />
    </Dialog>
  );
}


