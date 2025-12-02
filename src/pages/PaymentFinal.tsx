import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Home, FileText, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const PaymentFinal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const sessionId = searchParams.get("session_id");
  const paymentIntentId = searchParams.get("payment_intent");

  useEffect(() => {
    if (sessionId || paymentIntentId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId, paymentIntentId]);

  const verifyPayment = async () => {
    try {
      let paymentData = null;

      if (sessionId) {
        const { data, error } = await supabase
          .from("payments")
          .select("*, invoices(*), ai_quotes(*)")
          .eq("stripe_session_id", sessionId)
          .single();

        if (!error && data) {
          paymentData = data;
        }
      } else if (paymentIntentId) {
        const { data, error } = await supabase
          .from("payments")
          .select("*, invoices(*), ai_quotes(*)")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .single();

        if (!error && data) {
          paymentData = data;
        }
      }

      if (paymentData) {
        setPayment(paymentData);
        if (paymentData.status === "succeeded") {
          toast({
            title: "Paiement confirmé",
            description: "Votre paiement a été traité avec succès.",
          });
        }
      }
    } catch (err) {
      console.error("Error verifying payment:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Vérification du paiement...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <GlassCard className="p-12 max-w-md w-full">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Paiement finalisé</h1>
            <p className="text-muted-foreground">
              Votre paiement a été traité avec succès
            </p>
          </div>

          {payment && (
            <div className="w-full space-y-4 p-6 bg-muted/50 rounded-xl text-left">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Montant:</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: payment.currency || "EUR",
                  }).format((payment.amount || 0) / 100)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Statut:</span>
                <Badge variant="default" className="bg-green-500">
                  {payment.status === "succeeded" ? "Payé" : payment.status}
                </Badge>
              </div>
              {payment.invoices && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Facture:</span>
                  <span className="font-semibold">
                    {payment.invoices.invoice_number || "N/A"}
                  </span>
                </div>
              )}
              {payment.ai_quotes && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Devis:</span>
                  <span className="font-semibold">
                    N° {payment.ai_quotes.quote_number || "N/A"}
                  </span>
                </div>
              )}
              {payment.payment_type && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">
                    {payment.payment_type === "deposit" ? "Acompte" : "Facture complète"}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1 rounded-xl gap-2"
            >
              <Home className="w-4 h-4" />
              Accueil
            </Button>
            {payment?.invoice_id && (
              <Link to={`/invoices`} className="flex-1">
                <Button className="w-full rounded-xl gap-2">
                  <FileText className="w-4 h-4" />
                  Mes factures
                </Button>
              </Link>
            )}
            {payment?.quote_id && (
              <Link to={`/quotes`} className="flex-1">
                <Button className="w-full rounded-xl gap-2">
                  <FileText className="w-4 h-4" />
                  Mes devis
                </Button>
              </Link>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Un email de confirmation a été envoyé à votre adresse.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default PaymentFinal;
