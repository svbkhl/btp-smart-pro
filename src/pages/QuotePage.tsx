/**
 * Page publique pour voir un devis
 * Route: /quote/:id
 * Accessible sans authentification
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractUUID } from "@/utils/uuidExtractor";

export default function QuotePage() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Extraire l'UUID valide (l'ID peut contenir un suffixe de sécurité)
  const id = rawId ? extractUUID(rawId) : null;

  // Charger le devis via Edge Function publique
  useEffect(() => {
    if (!rawId) {
      setError("ID du devis manquant");
      setLoading(false);
      return;
    }

    if (!id) {
      console.error("❌ [QuotePage] Impossible d'extraire l'UUID de:", rawId);
      setError("Format d'ID invalide");
      setLoading(false);
      return;
    }

    const loadQuote = async () => {
      try {
        // Utiliser l'Edge Function get-public-document pour récupérer le devis
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log("🔍 [QuotePage] Chargement du devis:", { rawId, extractedUUID: id });

        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-public-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            quote_id: id, // Utiliser l'UUID extrait, pas l'ID complet
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

        setQuote(result.document);
        setLoading(false);
      } catch (err: any) {
        console.error("❌ Erreur:", err);
        setError("Erreur lors du chargement du devis");
        setLoading(false);
      }
    };

    loadQuote();
  }, [rawId, id]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Devis {quote.quote_number || id || rawId}
            </CardTitle>
            <CardDescription>
              {quote.signed && quote.signed_at ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Signé le {new Date(quote.signed_at).toLocaleDateString("fr-FR")}
                </span>
              ) : (
                "Document à signer"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client :</span>
                <span className="font-medium">{quote.client_name || "Non spécifié"}</span>
              </div>
              {quote.client_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email :</span>
                  <span className="font-medium">{quote.client_email}</span>
                </div>
              )}
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
              {quote.work_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type de travaux :</span>
                  <span className="font-medium">{quote.work_type}</span>
                </div>
              )}
              {quote.surface && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface :</span>
                  <span className="font-medium">{quote.surface} m²</span>
                </div>
              )}
              {quote.details && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Détails :</p>
                  <p className="text-sm">{quote.details.description || "Aucun détail"}</p>
                </div>
              )}
            </div>

            {!quote.signed && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Pour signer ce devis, cliquez sur le bouton ci-dessous.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate(`/sign/${id}`)}
                    className="flex-1"
                    size="lg"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Signer le devis
                  </Button>
                </div>
              </>
            )}

            <div className="pt-4 border-t">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full"
              >
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





