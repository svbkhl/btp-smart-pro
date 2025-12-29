import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signQuote } from "@/services/aiService";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileSignature, X, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  };

  const handleSign = async () => {
    if (!id || !signerName.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez saisir votre nom et signer",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSigning(true);

    try {
      const signatureData = canvas.toDataURL("image/png");

      await signQuote(id, signatureData, signerName.trim());

      setSigned(true);
      toast({
        title: "Devis signé !",
        description: "Le devis a été signé avec succès.",
      });
    } catch (error: any) {
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold mb-2">Devis signé</h1>
          <p className="text-muted-foreground mb-4">
            Le devis a été signé avec succès
          </p>
          {quote && (
            <Badge variant="default" className="mb-4">
              Devis {quote.quote_number || quote.id}
            </Badge>
          )}
          <Button onClick={() => navigate("/quotes")}>Retour aux devis</Button>
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <GlassCard className="p-8 max-w-2xl w-full">
        <div className="space-y-6">
          <div className="text-center">
            <FileSignature className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-bold mb-2">Signature de devis</h1>
            <p className="text-muted-foreground">
              Veuillez signer le devis <strong>{quote.quote_number || quote.id}</strong>
            </p>
            {quote.client_name && (
              <p className="text-sm text-muted-foreground mt-1">
                Client: {quote.client_name}
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
