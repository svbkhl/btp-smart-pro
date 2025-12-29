/**
 * Page de signature pour les clients
 * Route: /signature/:id
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSignatureByLink, useSignDocument } from "@/hooks/useSignatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractUUID } from "@/utils/uuidExtractor";

export default function SignaturePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [signing, setSigning] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);

  const { data: signature, isLoading, error } = useSignatureByLink(id);
  const signDocument = useSignDocument();

  // Charger le devis ou la facture associé
  useEffect(() => {
    if (!signature) return;

    const loadDocument = async () => {
      if (signature.quote_id) {
        // Extraire l'UUID valide si nécessaire (signature.quote_id vient de la DB donc devrait être valide, mais on vérifie quand même)
        const validQuoteId = extractUUID(signature.quote_id) || signature.quote_id;
        
        const { data, error } = await supabase
          .from("ai_quotes")
          .select("*")
          .eq("id", validQuoteId) // Utiliser l'UUID extrait ou l'ID original
          .single();

        if (!error && data) {
          setQuote(data);
        }
      } else if (signature.invoice_id) {
        // Extraire l'UUID valide si nécessaire
        const validInvoiceId = extractUUID(signature.invoice_id) || signature.invoice_id;
        
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", validInvoiceId) // Utiliser l'UUID extrait ou l'ID original
          .single();

        if (!error && data) {
          setInvoice(data);
        }
      }
    };

    loadDocument();
  }, [signature]);

  const handleSign = async () => {
    if (!signature || !id) return;

    setSigning(true);
    try {
      await signDocument.mutateAsync({
        signatureId: id,
        signatureData: undefined, // Vous pouvez ajouter une signature canvas ici
      });

      // Vérifier si un lien de paiement a été généré
      // Si oui, rediriger vers le paiement, sinon afficher un message de confirmation
      setTimeout(async () => {
        // Recharger la signature pour voir si un lien de paiement a été créé
        const { data: updatedSignature } = await supabase
          .from("signatures")
          .select("payment_link, quote_id, invoice_id")
          .eq("id", id)
          .single();

        if (updatedSignature?.payment_link) {
          // Rediriger vers le lien de paiement
          window.location.href = updatedSignature.payment_link;
        } else {
          // Afficher un message de confirmation sans redirection
          toast({
            title: "Document signé !",
            description: "Merci d'avoir signé. Vous recevrez un email de confirmation.",
            variant: "default",
          });
          
          // Rediriger vers une page de confirmation après 3 secondes
          setTimeout(() => {
            navigate("/");
          }, 3000);
        }
      }, 2000);
    } catch (error: any) {
      console.error("Erreur lors de la signature:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de signer le document",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (error || !signature) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Document introuvable
            </CardTitle>
            <CardDescription>
              Le lien de signature est invalide ou a expiré.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (signature.signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Document déjà signé
            </CardTitle>
            <CardDescription>
              Ce document a déjà été signé le {new Date(signature.signed_at!).toLocaleDateString("fr-FR")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signature.payment_link ? (
              <Button
                onClick={() => window.location.href = signature.payment_link!}
                className="w-full"
              >
                Accéder au paiement
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full"
              >
                Retour à l'accueil
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const document = quote || invoice;
  const documentType = quote ? "devis" : "facture";
  const documentNumber = quote?.quote_number || invoice?.invoice_number || "N/A";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Signature du {documentType}
            </CardTitle>
            <CardDescription>
              {documentType === "devis" ? "Devis" : "Facture"} {documentNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {document && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client :</span>
                  <span className="font-medium">{signature.client_name || signature.client_email}</span>
                </div>
                {quote && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Montant estimé :</span>
                      <span className="font-medium">
                        {quote.estimated_cost
                          ? new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            }).format(quote.estimated_cost)
                          : "N/A"}
                      </span>
                    </div>
                    {quote.details && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Détails :</p>
                        <p className="text-sm">{quote.details.description || "Aucun détail"}</p>
                      </div>
                    )}
                  </>
                )}
                {invoice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant :</span>
                    <span className="font-medium">
                      {invoice.amount_ttc
                        ? new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          }).format(invoice.amount_ttc)
                        : "N/A"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                En signant ce document, vous acceptez les conditions et vous serez redirigé vers la page de paiement.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button
                onClick={handleSign}
                disabled={signing}
                className="flex-1"
                size="lg"
              >
                {signing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signature en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Signer le document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

