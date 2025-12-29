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
import { extractUUID } from "@/utils/uuidExtractor";

export default function SignaturePage() {
  const { quoteId: rawQuoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Extraire l'UUID du paramètre d'URL (peut contenir un suffixe de sécurité)
  const quoteId = rawQuoteId ? extractUUID(rawQuoteId) : null;

  // Charger le devis via Edge Function publique
  useEffect(() => {
    if (!rawQuoteId) {
      setError("ID du devis manquant");
      setLoading(false);
      return;
    }

    if (!quoteId) {
      console.error("❌ Impossible d'extraire l'UUID de:", rawQuoteId);
      setError("Format d'ID invalide");
      setLoading(false);
      return;
    }

    const loadQuote = async () => {
      try {
        // Utiliser l'Edge Function get-public-document pour récupérer le devis
        // Cela permet d'accéder au devis sans authentification (pour les clients)
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log("🔍 [SignaturePage] Chargement du devis:", { rawQuoteId, extractedUUID: quoteId });

        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-public-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            quote_id: quoteId, // Utiliser l'UUID extrait, pas l'ID complet
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
          console.error("❌ Erreur chargement devis:", errorData);
          setError(errorData.error || "Devis introuvable");
          setLoading(false);
          return;
        }

        const result = await response.json();

        if (!result.document) {
          setError("Devis introuvable");
          setLoading(false);
          return;
        }

        // Le document retourné contient maintenant toutes les données nécessaires
        const quoteData = result.document;

        // Vérifier si déjà signé
        if (quoteData.signed && quoteData.signed_at) {
          setQuote(quoteData);
          setLoading(false);
          return;
        }

        setQuote(quoteData);
        setLoading(false);
      } catch (err: any) {
        console.error("❌ Erreur:", err);
        setError("Erreur lors du chargement du devis");
        setLoading(false);
      }
    };

    loadQuote();
  }, [rawQuoteId, quoteId]);

  const handleSign = async () => {
    if (!quoteId || !quote) return;

    setSigning(true);
    try {
      // Utiliser l'Edge Function sign-quote pour signer le devis sans authentification
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/sign-quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          quote_id: quoteId, // Utiliser l'UUID extrait
          signer_name: quote.client_name || "Client",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        console.error("❌ Erreur signature:", errorData);
        throw new Error(errorData.error || "Impossible de signer le devis");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Impossible de signer le devis");
      }

      console.log("✅ Devis signé avec succès:", quoteId);

      toast({
        title: "Document signé !",
        description: "Le devis a été signé avec succès.",
      });

      // Recharger le devis pour afficher le statut mis à jour
      // quoteId est déjà l'UUID extrait
      if (quoteId) {
        const reloadResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-public-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            quote_id: quoteId,
          }),
        });

        if (reloadResponse.ok) {
          const reloadResult = await reloadResponse.json();
          if (reloadResult.document) {
            setQuote(reloadResult.document);
          }
        }
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
              Devis {quote.quote_number || quoteId || rawQuoteId}
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





