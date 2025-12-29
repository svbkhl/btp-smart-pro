/**
 * Page publique de paiement pour les clients
 * Routes: /payment/quote/:id et /payment/invoice/:id
 * Accessible sans authentification via un token
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { extractUUID } from "@/utils/uuidExtractor";

const PaymentPage = () => {
  const { id: rawId, type } = useParams<{ id: string; type: "quote" | "invoice" }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [document, setDocument] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const token = searchParams.get("token");

  // Extraire l'UUID valide (l'ID peut contenir un suffixe de sécurité)
  const id = rawId ? extractUUID(rawId) : null;

  useEffect(() => {
    if (rawId) {
      if (!id) {
        setError("Format d'ID invalide");
        setLoading(false);
        return;
      }
      loadDocument();
    }
  }, [rawId, id, type]);

  const loadDocument = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Déterminer le type depuis l'URL
      const isQuote = window.location.pathname.includes("/payment/quote/");
      const isInvoice = window.location.pathname.includes("/payment/invoice/");

      if (!isQuote && !isInvoice) {
        throw new Error("Type de document non reconnu");
      }

      console.log("🔍 [PaymentPage] Chargement du document:", { rawId, extractedUUID: id, isQuote });

      // Utiliser l'Edge Function publique pour récupérer le document
      // (car les tables peuvent être protégées par RLS)
      const { data, error: docError } = await supabase.functions.invoke(
        "get-public-document",
        {
          body: {
            [isQuote ? "quote_id" : "invoice_id"]: id, // Utiliser l'UUID extrait
            token: token || undefined,
          },
        }
      );

      if (docError) {
        throw docError;
      }

      if (!data?.document) {
        throw new Error(isQuote ? "Devis introuvable" : "Facture introuvable");
      }

      setDocument(data.document);

      // Si un paiement existe et est déjà payé, rediriger
      if (data.payment) {
        setPayment(data.payment);
        
        if (data.payment.paid || data.payment.status === "succeeded") {
          navigate(`/payment/success?session_id=${data.payment.stripe_session_id || data.payment.id}`);
          return;
        }
      }
    } catch (err: any) {
      console.error("Error loading document:", err);
      setError(err.message || "Impossible de charger le document");
      toast({
        title: "Erreur",
        description: err.message || "Impossible de charger le document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!document || !id) return;

    setProcessing(true);

    try {
      // Déterminer le type de document depuis l'URL
      const isQuote = window.location.pathname.includes("/payment/quote/");
      const documentType = isQuote ? "quote" : "invoice";

      // Appeler l'Edge Function pour créer la session de paiement
      // Cette fonction doit être publique et accepter le token
      const { data, error: paymentError } = await supabase.functions.invoke(
        "create-public-payment-session",
        {
          body: {
            [isQuote ? "quote_id" : "invoice_id"]: id, // Utiliser l'UUID extrait
            token: token || undefined,
            payment_type: isQuote ? "deposit" : "invoice",
          },
        }
      );

      if (paymentError) {
        throw paymentError;
      }

      if (!data?.checkout_url) {
        throw new Error("Impossible de créer la session de paiement");
      }

      // Rediriger vers Stripe Checkout ou autre provider
      window.location.href = data.checkout_url;
    } catch (err: any) {
      console.error("Error creating payment session:", err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer la session de paiement",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement du document...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-12 max-w-md w-full">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Document introuvable</h1>
              <p className="text-muted-foreground">
                {error || "Le document demandé n'existe pas ou n'est plus accessible."}
              </p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
              Retour à l'accueil
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const isQuote = window.location.pathname.includes("/payment/quote/");
  const documentType = isQuote ? "devis" : "facture";
  const documentNumber = isQuote ? document.quote_number : document.invoice_number;
  const amount = isQuote ? document.estimated_cost : document.amount_ttc;
  const clientName = document.client_name || document.client_email || "Client";

  // Vérifier si déjà payé
  if (payment && (payment.paid || payment.status === "succeeded")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-12 max-w-md w-full">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-6">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Paiement déjà effectué</h1>
              <p className="text-muted-foreground">
                Ce {documentType} a déjà été payé.
              </p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
              Retour à l'accueil
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <GlassCard className="p-12 max-w-2xl w-full">
        <div className="flex flex-col gap-8">
          {/* En-tête */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Paiement en ligne</h1>
            <p className="text-muted-foreground">
              {documentType.charAt(0).toUpperCase() + documentType.slice(1)} {documentNumber}
            </p>
          </div>

          {/* Détails du document */}
          <div className="space-y-4 p-6 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client :</span>
              <span className="font-semibold">{clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type :</span>
              <Badge variant="outline">
                {isQuote ? "Devis" : "Facture"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Numéro :</span>
              <span className="font-semibold">{documentNumber || "N/A"}</span>
            </div>
            {document.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date :</span>
                <span className="font-medium">
                  {new Date(document.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Montant à payer :</span>
                <span className="text-2xl font-bold text-primary">
                  {amount
                    ? new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      }).format(amount)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Informations de paiement */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Vous allez être redirigé vers une page de paiement sécurisée pour finaliser votre transaction.
              Les paiements sont traités de manière sécurisée via Stripe.
            </AlertDescription>
          </Alert>

          {/* Bouton de paiement */}
          <Button
            onClick={handlePayment}
            disabled={processing || !amount}
            size="lg"
            className="w-full rounded-xl h-14 text-lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Payer {amount ? new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(amount) : ""}
              </>
            )}
          </Button>

          {/* Informations de sécurité */}
          <p className="text-xs text-center text-muted-foreground">
            🔒 Paiement sécurisé • Vos données sont protégées
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default PaymentPage;

