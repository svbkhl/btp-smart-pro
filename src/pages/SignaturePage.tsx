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
import { Loader2, CheckCircle2, FileText, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractUUID } from "@/utils/uuidExtractor";
import SignatureCanvas from "@/components/signature/SignatureCanvas";
import { generateQuotePDF } from "@/services/pdfService";

export default function SignaturePage() {
  const { quoteId: rawQuoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Déterminer si rawQuoteId est un token (avec suffixe) ou un UUID pur
  const hasToken = rawQuoteId && rawQuoteId.length > 36; // Un token a plus de 36 caractères
  const quoteId = rawQuoteId && !hasToken ? extractUUID(rawQuoteId) : null;

  // Charger le devis via Edge Function publique
  useEffect(() => {
    if (!rawQuoteId) {
      setError("ID du devis manquant");
      setLoading(false);
      return;
    }

    const loadQuote = async () => {
      try {
        // Utiliser l'Edge Function get-public-document pour récupérer le devis
        // Cela permet d'accéder au devis sans authentification (pour les clients)
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log("🔍 [SignaturePage] Chargement du devis:", 
          "rawQuoteId:", rawQuoteId,
          "hasToken:", hasToken,
          "extractedUUID:", quoteId,
          "url:", `${SUPABASE_URL}/functions/v1/get-public-document`
        );

        // Si rawQuoteId contient un suffixe, c'est un token de session
        // Sinon, c'est un quote_id direct
        const requestBody = hasToken
          ? { token: rawQuoteId } // Envoyer comme token si c'est une session
          : { quote_id: quoteId }; // Envoyer comme quote_id si c'est un UUID pur

        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-public-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(requestBody),
        });

        console.log("📡 [SignaturePage] Réponse Edge Function:", 
          "status:", response.status,
          "statusText:", response.statusText,
          "ok:", response.ok
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
          console.error("❌ Erreur chargement devis:", 
            "status:", response.status,
            "errorData:", JSON.stringify(errorData),
            "quoteIdSent:", quoteId,
            "rawQuoteId:", rawQuoteId
          );
          setError(errorData.error || `Devis introuvable (Erreur ${response.status})`);
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
        
        // Générer le PDF pour l'aperçu
        generatePdfPreview(quoteData);
      } catch (err: any) {
        console.error("❌ Erreur:", err);
        setError("Erreur lors du chargement du devis");
        setLoading(false);
      }
    };

    loadQuote();
  }, [rawQuoteId, quoteId]);

  // Générer le PDF pour l'aperçu
  const generatePdfPreview = async (quoteData: any) => {
    try {
      setGeneratingPdf(true);
      const pdfBlob = await generateQuotePDF({
        result: {
          estimatedCost: quoteData.estimated_cost,
          workSteps: quoteData.details?.workSteps || [],
          materials: quoteData.details?.materials || [],
          description: quoteData.details?.description || "",
          quote_number: quoteData.quote_number,
        },
        companyInfo: {
          company_name: "BTP Smart Pro",
          address: "",
          phone: "",
          email: "",
          siret: "",
        },
        clientInfo: {
          name: quoteData.client_name,
          address: "",
          email: "",
          phone: "",
        },
        surface: quoteData.details?.surface || "",
        workType: quoteData.details?.prestation || "",
      });
      
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Erreur génération PDF aperçu:", error);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Nettoyer l'URL du PDF au démontage
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleSignatureComplete = (signature: string) => {
    setSignatureData(signature);
    setShowSignatureCanvas(false);
    handleSign(signature);
  };

  const handleSign = async (signature?: string) => {
    // Si pas de signature fournie, afficher le canvas
    if (!signature) {
      setShowSignatureCanvas(true);
      return;
    }

    if (!quote) return;

    setSigning(true);
    try {
      // Utiliser l'Edge Function sign-quote pour signer le devis sans authentification
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Récupérer des métadonnées pour la signature
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toISOString();

      console.log("📝 [SignaturePage] Envoi de la signature:", {
        hasToken,
        token: hasToken ? rawQuoteId : undefined,
        quote_id: !hasToken ? quoteId : undefined,
      });

      const response = await fetch(`${SUPABASE_URL}/functions/v1/sign-quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          token: hasToken ? rawQuoteId : undefined,
          quote_id: !hasToken ? quoteId : undefined,
          signature_data: signature,
          signer_name: quote.client_name || "Client",
          user_agent: userAgent,
          signed_at: timestamp,
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

      console.log("✅ Devis signé avec succès");

      toast({
        title: "✅ Document signé !",
        description: "Votre signature a été enregistrée avec succès. Vous allez être redirigé...",
        duration: 3000,
      });

      // Recharger le devis pour afficher le statut mis à jour
      const requestBody = hasToken
        ? { token: rawQuoteId }
        : { quote_id: quoteId };

      const reloadResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-public-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (reloadResponse.ok) {
        const reloadResult = await reloadResponse.json();
        if (reloadResult.document) {
          setQuote(reloadResult.document);
        }
      }

      // Rediriger après 3 secondes
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error: any) {
      console.error("Erreur lors de la signature:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de signer le document",
        variant: "destructive",
      });
      setShowSignatureCanvas(false);
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
      <div className="max-w-7xl mx-auto pt-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Aperçu PDF - Colonne gauche */}
          <div className="order-2 lg:order-1">
            <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border-border/50 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Aperçu du devis
                </CardTitle>
                <CardDescription>
                  Devis {quote.quote_number || quoteId || rawQuoteId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatingPdf ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pdfUrl ? (
                  <div className="space-y-4">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[600px] rounded-lg border border-border"
                      title="Aperçu du devis"
                    />
                    <Button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = pdfUrl;
                        link.download = `devis-${quote.quote_number || 'document'}.pdf`;
                        link.click();
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger le PDF
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    Aperçu non disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulaire de signature - Colonne droite */}
          <div className="order-1 lg:order-2">
            <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Signature du devis
                </CardTitle>
                <CardDescription>
                  Veuillez signer pour confirmer votre accord
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client :</span>
                    <span className="font-medium">{quote.client_name || "Non spécifié"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant TTC :</span>
                    <span className="font-medium text-lg text-primary">
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
                      <p className="text-sm text-muted-foreground mb-2">Description :</p>
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

                {!showSignatureCanvas && !signing ? (
                  <div className="flex gap-4">
                    <Button
                      onClick={() => handleSign()}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      size="lg"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Signer le devis
                    </Button>
                  </div>
                ) : signing ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Enregistrement de votre signature...</p>
                  </div>
                ) : (
                  <SignatureCanvas
                    onSignatureComplete={handleSignatureComplete}
                    disabled={signing}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}





