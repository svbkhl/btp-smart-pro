/**
 * Composant Canvas pour signature électronique
 * Permet de dessiner une signature avec le doigt ou la souris
 */

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eraser, Check, PenTool } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureComplete: (signatureData: string) => void;
  disabled?: boolean;
}

export default function SignatureCanvas({ onSignatureComplete, disabled }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configuration du canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Style du trait
    ctx.strokeStyle = "#1e40af"; // Bleu professionnel
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setContext(ctx);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !context) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || !context) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
  };

  const clearSignature = () => {
    if (!context || !canvasRef.current) return;
    const canvas = canvasRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const validateSignature = () => {
    if (!canvasRef.current || !hasSignature) return;
    
    // Convertir le canvas en base64
    const signatureData = canvasRef.current.toDataURL("image/png");
    onSignatureComplete(signatureData);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white dark:bg-gray-800 border-2 border-dashed border-primary/30">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PenTool className="h-4 w-4" />
            <span>Signez dans le cadre ci-dessous avec votre doigt ou votre souris</span>
          </div>
          
          <canvas
            ref={canvasRef}
            className="w-full h-40 border-2 border-border rounded-lg bg-white cursor-crosshair touch-none"
            style={{ touchAction: "none" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearSignature}
              disabled={!hasSignature || disabled}
              className="flex-1"
            >
              <Eraser className="mr-2 h-4 w-4" />
              Effacer
            </Button>
            <Button
              type="button"
              onClick={validateSignature}
              disabled={!hasSignature || disabled}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Valider la signature
            </Button>
          </div>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>✓ Signature horodatée et sécurisée</p>
        <p>✓ Conforme aux normes de signature électronique</p>
      </div>
    </div>
  );
}

