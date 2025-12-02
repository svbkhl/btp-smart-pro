import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Euro } from "lucide-react";
import { Invoice } from "@/hooks/useInvoices";

interface PaymentButtonProps {
  invoice: Invoice;
  paymentType?: "invoice" | "deposit";
  depositPercentage?: number;
  depositFixedAmount?: number;
}

export const PaymentButton = ({
  invoice,
  paymentType = "invoice",
  depositPercentage,
  depositFixedAmount,
}: PaymentButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!invoice.client_email) {
      toast({
        title: "Email manquant",
        description: "L'email du client est requis pour le paiement",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Récupérer la session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Vous devez être connecté");
      }

      // Appeler l'Edge Function pour créer la session Stripe
      const { data, error } = await supabase.functions.invoke(
        "create-payment-session",
        {
          body: {
            invoice_id: invoice.id,
            payment_type: paymentType,
            amount: paymentType === "invoice" ? invoice.amount_ttc : undefined,
            deposit_percentage: depositPercentage,
            deposit_fixed_amount: depositFixedAmount,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.checkout_url) {
        throw new Error("Impossible de créer la session de paiement");
      }

      // Rediriger vers Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      toast({
        title: "Erreur",
        description:
          error.message || "Impossible de créer la session de paiement",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Ne pas afficher le bouton si la facture est déjà payée
  if (invoice.payment_status === "paid" || invoice.status === "paid") {
    return null;
  }

  // Ne pas afficher si la facture n'est pas signée (pour les factures)
  if (paymentType === "invoice" && invoice.status !== "signed") {
    return null;
  }

  const buttonText =
    paymentType === "deposit"
      ? `Payer l'acompte (${depositPercentage ? `${depositPercentage}%` : depositFixedAmount ? `${depositFixedAmount}€` : "30%"})`
      : `Payer ${invoice.amount_ttc?.toLocaleString("fr-FR", {
          style: "currency",
          currency: "EUR",
        })}`;

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className="gap-2 rounded-xl"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirection...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

