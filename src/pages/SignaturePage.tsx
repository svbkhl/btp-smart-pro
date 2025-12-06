/**
 * Page de signature pour les clients
 * Route: /sign/:quoteId
 * Version simplifiée qui utilise directement quoteId depuis l'URL
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignaturePage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger le devis
  useEffect(() => {
    if (!quoteId) {
      setError("ID du devis manquant");
      setLoading(false);
      return;
    }

    const loadQuote = async () => {
      try {
        const { data, error: quoteError } = await supabase
          .from("ai_quotes")
          .select("*")
          .eq("id", quoteId)
          .single();

        if (quoteError) {
          console.error("❌ Erreur chargement devis:", quoteError);
          setError("Devis introuvable");
          setLoading(false);
          return;
        }

        if (!data) {
          setError("Devis introuvable");
          setLoading(false);
          return;
        }

        // Vérifier si déjà signé
        if (data.signed && data.signed_at) {
          setQuote(data);
          setLoading(false);
          return;
        }

        setQuote(data);
        setLoading(false);
      } catch (err: any) {
        console.error("❌ Erreur:", err);
        setError("Erreur lors du chargement du devis");
        setLoading(false);
      }
    };

    loadQuote();
  }, [quoteId]);

  const handleSign = async () => {
    if (!quoteId || !quote) return;

    setSigning(true);
    try {
      // Mettre à jour le devis
      const { error: updateError } = await supabase
        .from("ai_quotes")
        .update({
          signed: true,
          signed_at: new Date().toISOString(),
          status: "signed",
        })
        .eq("id", quoteId);

      if (updateError) {
        console.error("❌ Erreur signature:", updateError);
        throw new Error(`Impossible de signer le devis: ${updateError.message}`);
      }

      console.log("✅ Devis signé avec succès:", quoteId);

      toast({
        title: "Document signé !",
        description: "Le devis a été signé avec succès.",
      });

      // Recharger le devis pour afficher le statut mis à jour
      const { data: updatedQuote } = await supabase
        .from("ai_quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (updatedQuote) {
        setQuote(updatedQuote);
      }

      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate("/");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {error || "Devis introuvable"}
            </CardTitle>
            <CardDescription>
              {error || "Le devis demandé n'existe pas ou a été supprimé."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quote.signed && quote.signed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Document déjà signé
            </CardTitle>
            <CardDescription>
              Ce devis a déjà été signé le {new Date(quote.signed_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Signature du devis
            </CardTitle>
            <CardDescription>
              Devis {quote.quote_number || quoteId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client :</span>
                <span className="font-medium">{quote.client_name || "Non spécifié"}</span>
              </div>
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
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                En signant ce document, vous acceptez les conditions et confirmez votre accord avec ce devis.
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
                    Signer le devis
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



