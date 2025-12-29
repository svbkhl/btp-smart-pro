import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2 } from "lucide-react";
import { Quote } from "@/hooks/useQuotes";

interface DepositPaymentLinkProps {
  quote: Quote;
  depositPercentage?: number;
  depositFixedAmount?: number;
}

export const DepositPaymentLink = ({
  quote,
  depositPercentage,
  depositFixedAmount,
}: DepositPaymentLinkProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté");
      }

      // Calculer le montant de l'acompte
      let depositAmount = 0;
      if (depositFixedAmount) {
        depositAmount = depositFixedAmount;
      } else if (depositPercentage) {
        depositAmount = (quote.estimated_cost * depositPercentage) / 100;
      } else {
        depositAmount = quote.estimated_cost * 0.3; // 30% par défaut
      }

      // Appeler l'Edge Function pour créer la session Stripe
      const { data, error } = await supabase.functions.invoke("create-payment-session", {
        body: {
          quote_id: quote.id,
          payment_type: "deposit",
          amount: depositAmount,
          deposit_percentage: depositPercentage,
          deposit_fixed_amount: depositFixedAmount,
        },
      });

      if (error) throw error;

      if (!data?.checkout_url) {
        throw new Error("Impossible de créer la session de paiement");
      }

      // Rediriger vers Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session de paiement",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (quote.status !== "accepted") {
    return null;
  }

  const depositAmount = depositFixedAmount
    ? depositFixedAmount
    : depositPercentage
    ? (quote.estimated_cost * depositPercentage) / 100
    : quote.estimated_cost * 0.3;

  const buttonText = depositPercentage
    ? `Payer l'acompte (${depositPercentage}%)`
    : depositFixedAmount
    ? `Payer l'acompte (${depositFixedAmount}€)`
    : `Payer l'acompte (30%)`;

  return (
    <Button onClick={handlePayment} disabled={loading} className="gap-2">
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirection...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          {buttonText} - {depositAmount.toFixed(2)}€
        </>
      )}
    </Button>
  );
};



















