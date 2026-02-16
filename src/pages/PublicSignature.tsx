import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileSignature, X, CheckCircle2, Download, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuoteDisplay } from "@/components/ai/QuoteDisplay";
import { InvoiceDisplay } from "@/components/invoices/InvoiceDisplay";
import { useUserSettings } from "@/hooks/useUserSettings";
import { DepositPaymentLink } from "@/components/quotes/DepositPaymentLink";
import { PaymentButton } from "@/components/invoices/PaymentButton";
import { downloadQuotePDF } from "@/services/pdfService";
import { downloadInvoicePDF } from "@/services/invoicePdfService";
import { trackSigned } from "@/services/statusTrackingService";
import { extractUUID } from "@/utils/uuidExtractor";

const PublicSignature = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [session, setSession] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { data: companyInfo } = useUserSettings();

  useEffect(() => {
    loadSession();
  }, [token]);

  const loadSession = async () => {
    if (!token) {
      toast({
        title: "Token manquant",
        description: "Le lien de signature est invalide",
        variant: "destructive",
      });
      return;
    }

    try {
      // Charger la session de signature
      const { data: sessionData, error: sessionError } = await supabase
        .from("signature_sessions")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (sessionError || !sessionData) {
        console.error("[PublicSignature] Session not found:", sessionError);
        toast({
          title: "Session invalide",
          description: "Session de signature introuvable ou expirée",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Vérifier l'expiration
      if (new Date(sessionData.expires_at) < new Date()) {
        console.error("[PublicSignature] Session expired:", {
          expiresAt: sessionData.expires_at,
          now: new Date().toISOString()
        });
        toast({
          title: "Session expirée",
          description: "Cette session de signature a expiré. Veuillez demander un nouveau lien.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // Charger la facture ou le devis associé
      if (sessionData.invoice_id) {
        // Extraire l'UUID valide si nécessaire (par sécurité)
        const validInvoiceId = extractUUID(sessionData.invoice_id) || sessionData.invoice_id;
        
        const { data: invoiceData } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", validInvoiceId) // Utiliser l'UUID extrait ou l'ID original
          .single();
        setInvoice(invoiceData);
      } else if (sessionData.quote_id) {
        // Extraire l'UUID valide si nécessaire (par sécurité)
        const validQuoteId = extractUUID(sessionData.quote_id) || sessionData.quote_id;
        
        const { data: quoteData } = await supabase
          .from("ai_quotes")
          .select("*")
          .eq("id", validQuoteId) // Utiliser l'UUID extrait ou l'ID original
          .single();
        setQuote(quoteData);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger la session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();

    const data = canvas.toDataURL("image/png");
    setSignatureData(data);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
  };

  const handleSign = async () => {
    if (!signerName.trim() || !signatureData) {
      toast({
        title: "Information manquante",
        description: "Veuillez saisir votre nom et signer",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);

    try {
      // Mettre à jour la session
      await supabase
        .from("signature_sessions")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          signature_data: signatureData,
          signer_name: signerName.trim(),
        })
        .eq("id", session.id);

      // Mettre à jour la facture ou le devis
      if (invoice) {
        // Extraire l'UUID valide si nécessaire
        const validInvoiceId = extractUUID(invoice.id) || invoice.id;
        
        await supabase
          .from("invoices")
          .update({
            signature_data: signatureData,
            signed_by: signerName.trim(),
            signed_at: new Date().toISOString(),
            status: "signed",
          })
          .eq("id", validInvoiceId); // Utiliser l'UUID extrait
        
        // Tracker la signature
        await trackSigned("invoice", validInvoiceId, signerName.trim(), signatureData);
      } else if (quote) {
        // Extraire l'UUID valide si nécessaire
        const validQuoteId = extractUUID(quote.id) || quote.id;
        
        await supabase
          .from("ai_quotes")
          .update({
            signature_data: signatureData,
            signed_by: signerName.trim(),
            signed_at: new Date().toISOString(),
            status: "accepted",
          })
          .eq("id", validQuoteId); // Utiliser l'UUID extrait
        
        // Tracker la signature
        await trackSigned("quote", validQuoteId, signerName.trim(), signatureData);
      }

      setSigned(true);
      toast({
        title: "Signature enregistrée",
        description: "Votre signature a été enregistrée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la signature",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <h1 className="text-2xl font-bold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Vérification de la session de signature</p>
        </GlassCard>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold mb-2">Signature enregistrée</h1>
          <p className="text-muted-foreground mb-4">
            Votre signature a été enregistrée avec succès
          </p>
          {invoice && (
            <Badge variant="default" className="mb-4">
              Facture {invoice.invoice_number}
            </Badge>
          )}
          {quote && (
            <Badge variant="default" className="mb-4">
              Devis {quote.quote_number}
            </Badge>
          )}
          <Button onClick={() => window.close()}>Fermer</Button>
        </GlassCard>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Session invalide</h1>
          <p className="text-muted-foreground mb-4">
            Cette session de signature est invalide ou a expiré
          </p>
          <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
        </GlassCard>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      if (invoice) {
        await downloadInvoicePDF({
          invoice,
          companyInfo: companyInfo || undefined,
        });
      } else if (quote) {
        await downloadQuotePDF({
          result: quote.details || {},
          companyInfo: companyInfo || undefined,
          clientInfo: {
            name: quote.client_name,
          },
          surface: "",
          workType: "",
          quoteDate: new Date(quote.created_at),
          quoteNumber: quote.quote_number,
        });
      }
      toast({
        title: "PDF téléchargé",
        description: "Le document a été téléchargé en PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger le PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background to-muted">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Affichage du document */}
        {(invoice || quote) && (
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {invoice ? `Facture ${invoice.invoice_number}` : `Devis ${quote.quote_number}`}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="gap-2"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Télécharger PDF
                  </>
                )}
              </Button>
            </div>
            
            {/* Affichage HTML du document */}
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 max-h-[600px] overflow-y-auto">
              {invoice ? (
                <InvoiceDisplay invoice={invoice} showActions={false} />
              ) : quote ? (
                <QuoteDisplay
                  result={quote.details || {}}
                  companyInfo={companyInfo}
                  clientInfo={{
                    name: quote.client_name,
                  }}
                  surface=""
                  workType=""
                  quoteDate={new Date(quote.created_at)}
                  quoteNumber={quote.quote_number}
                />
              ) : null}
            </div>
          </GlassCard>
        )}

        {/* Formulaire de signature */}
        <GlassCard className="p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="text-center">
              <FileSignature className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-2">Signature électronique</h1>
              {invoice && (
                <p className="text-muted-foreground">
                  Veuillez signer la facture <strong>{invoice.invoice_number}</strong>
                </p>
              )}
              {quote && (
                <p className="text-muted-foreground">
                  Veuillez signer le devis <strong>{quote.quote_number}</strong>
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signerName">Nom du signataire *</Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Votre nom complet"
                  disabled={signing}
                  className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label>Signature *</Label>
                <div className="border-2 border-dashed rounded-lg p-4 bg-white dark:bg-gray-900">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full touch-none cursor-crosshair bg-white dark:bg-gray-900 rounded-lg border"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  disabled={signing}
                  className="w-full gap-2"
                >
                  <X className="w-4 h-4" />
                  Effacer la signature
                </Button>
              </div>

              <Button
                onClick={handleSign}
                disabled={signing || !signerName.trim() || !signatureData}
                className="w-full gap-2 rounded-xl"
                size="lg"
              >
                {signing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4" />
                    Signer
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Bouton de paiement après signature (si signé) */}
        {signed && quote && quote.status === "accepted" && (
          <GlassCard className="p-6 max-w-2xl mx-auto text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Devis signé avec succès</h2>
            <p className="text-muted-foreground mb-6">
              Vous pouvez maintenant procéder au paiement de l'acompte
            </p>
            <DepositPaymentLink quote={quote} />
          </GlassCard>
        )}

        {signed && invoice && invoice.status === "signed" && (
          <GlassCard className="p-6 max-w-2xl mx-auto text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Facture signée avec succès</h2>
            <p className="text-muted-foreground mb-6">
              Vous pouvez maintenant procéder au paiement
            </p>
            <PaymentButton invoice={invoice} />
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default PublicSignature;
