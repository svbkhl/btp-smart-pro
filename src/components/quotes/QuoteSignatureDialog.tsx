import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { signQuote } from "@/services/aiService";
import { Loader2, FileSignature, X } from "lucide-react";
import { Quote } from "@/hooks/useQuotes";

interface QuoteSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  onSigned?: () => void;
}

export const QuoteSignatureDialog = ({
  open,
  onOpenChange,
  quote,
  onSigned,
}: QuoteSignatureDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signerName, setSignerName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
    if (!quote || !signerName.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez saisir votre nom et signer",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);

    try {
      const signatureData = canvas.toDataURL("image/png");

      await signQuote(quote.id, signatureData, signerName.trim());

      toast({
        title: "Devis signé !",
        description: "Le devis a été signé avec succès.",
      });

      setSignerName("");
      clearSignature();
      onOpenChange(false);
      onSigned?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de signer le devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            Signature électronique
          </DialogTitle>
          <DialogDescription>
            Signez le devis pour {quote?.client_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signerName">Nom du signataire</Label>
            <Input
              id="signerName"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Votre nom complet"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Signature</Label>
            <div className="border rounded-lg">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full touch-none cursor-crosshair bg-white rounded-lg"
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
              disabled={loading}
              className="w-full gap-2"
            >
              <X className="w-4 h-4" />
              Effacer la signature
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSign} disabled={loading || !signerName.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signature en cours...
              </>
            ) : (
              <>
                <FileSignature className="w-4 h-4 mr-2" />
                Signer le devis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



















