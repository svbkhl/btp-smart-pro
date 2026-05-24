import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileSignature, X, CheckCircle2, FileText, Euro, User, Calendar, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { extractUUID } from "@/utils/uuidExtractor";

const SignatureQuote = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [signerName, setSignerName] = useState("");
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Extraire l'UUID valide (l'ID peut contenir un suffixe de sécurité)
  const id = rawId ? extractUUID(rawId) : null;

  useEffect(() => {
    if (rawId) {
      if (!id) {
        toast({
          title: "Erreur",
          description: "Format d'ID invalide",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      loadQuote();
    }
  }, [rawId, id, toast]);

  const loadQuote = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const { data: quoteData, error } = await supabase
        .from("ai_quotes")
        .select("*")
        .eq("id", id) // Utiliser l'UUID extrait
        .single();

      if (error) throw error;
      setQuote(quoteData);

      // Track when client opens the quote (first time only)
      const alreadyOpened = quoteData?.client_opened_at || quoteData?.details?.client_opened_at;
      if (quoteData && !alreadyOpened) {
        console.log("📧 Tracking ouverture du devis:", id);
        const { error: trackError } = await supabase.rpc("track_quote_opened", { quote_id: id });
        if (trackError) {
          console.error("❌ track_quote_opened failed:", trackError);
        } else {
          console.log("✅ client_opened_at mis à jour en base");
        }
      } else {
        console.log("ℹ️ Devis déjà marqué comme consulté:", alreadyOpened);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger le devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    setIsDrawing(false);
  };

  const isCanvasEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return !imageData.data.some((v, i) => i % 4 === 3 && v > 0);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!id || !signerName.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez saisir votre nom complet",
        variant: "destructive",
      });
      return;
    }

    if (isCanvasEmpty()) {
      toast({
        title: "Signature manquante",
        description: "Veuillez dessiner votre signature dans le cadre",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSigning(true);

    try {
      const signatureData = canvas.toDataURL("image/png");

      // Appel RPC SECURITY DEFINER — fonctionne sans session (client anonyme)
      const { data: result, error } = await supabase.rpc("sign_quote_anon", {
        p_quote_id: id,
        p_signature_data: signatureData,
        p_signer_name: signerName.trim(),
      });

      if (error) {
        console.error("❌ sign_quote_anon RPC error:", error);
        throw new Error(error.message || "Erreur lors de la signature");
      }

      if (result && result.success === false) {
        console.error("❌ sign_quote_anon returned failure:", result.error);
        throw new Error(result.error || "Impossible de signer le devis");
      }

      console.log("✅ Devis signé avec succès en base");
      setSigned(true);
    } catch (error: any) {
      console.error("❌ handleSign error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de signer le devis",
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
          <p className="text-muted-foreground">Chargement du devis</p>
        </GlassCard>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <GlassCard className="p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
          <h1 className="text-2xl font-bold">Merci pour votre signature !</h1>
          <p className="text-muted-foreground">
            Votre devis a bien été signé électroniquement. Vous pouvez fermer cette page.
          </p>
          {quote && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Devis <strong>{quote.quote_number || quote.id.slice(0, 8)}</strong></p>
              <p>Signé le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md w-full text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Devis introuvable</h1>
          <p className="text-muted-foreground mb-4">
            Le devis demandé n'existe pas ou n'est plus accessible
          </p>
          <Button onClick={() => navigate("/quotes")}>Retour aux devis</Button>
        </GlassCard>
      </div>
    );
  }

  const totalTtc = quote.total_ttc || quote.estimated_cost || 0;
  const totalHt = quote.subtotal_ht || quote.estimated_cost || 0;
  const tva293b = quote.tva_non_applicable_293b ?? false;
  const formattedAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: quote.currency || 'EUR', minimumFractionDigits: 2 }).format(totalTtc);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <GlassCard className="p-6 sm:p-8 max-w-2xl w-full">
        <div className="space-y-6">
          <div className="text-center">
            <FileSignature className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Signature de devis</h1>
            <p className="text-muted-foreground text-sm">
              Devis <strong>{quote.quote_number || quote.id.slice(0,8)}</strong>
            </p>
          </div>

          {/* Récapitulatif devis */}
          <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
            {quote.client_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{quote.client_name}</span>
              </div>
            )}
            {quote.created_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Émis le {new Date(quote.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
            {(quote.details?.description || quote.details?.prestation) && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <FileCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{quote.details?.description || quote.details?.prestation}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Euro className="w-4 h-4" />
                <span>Montant total {tva293b ? 'HT (TVA non applicable)' : 'TTC'}</span>
              </div>
              <span className="text-2xl font-bold text-primary">{formattedAmount}</span>
            </div>
            {!tva293b && totalHt > 0 && totalHt !== totalTtc && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>HT</span>
                <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: quote.currency || 'EUR' }).format(totalHt)}</span>
              </div>
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
              />
            </div>

            <div className="space-y-2">
              <Label>Signature *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full touch-none cursor-crosshair bg-white rounded-lg border"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  onTouchCancel={stopDrawing}
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
              disabled={signing || !signerName.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {signing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <FileSignature className="w-4 h-4" />
                  Signer le devis
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default SignatureQuote;
