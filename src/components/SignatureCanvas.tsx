import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileSignature, X } from "lucide-react";

interface SignatureCanvasProps {
  value?: string;
  onChange: (signatureData: string) => void;
  signerName?: string;
  onSignerNameChange?: (name: string) => void;
}

export const SignatureCanvas = ({
  value,
  onChange,
  signerName = "",
  onSignerNameChange,
}: SignatureCanvasProps) => {
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
    
    // Sauvegarder automatiquement la signature
    const signatureData = canvas.toDataURL("image/png");
    onChange(signatureData);
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
    onChange("");
  };

  // Charger la signature existante si elle existe
  useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    } else if (!value && canvasRef.current) {
      // Effacer le canvas si pas de signature
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [value]);

  return (
    <div className="space-y-3">
      {onSignerNameChange && (
        <div className="space-y-2">
          <Label htmlFor="signerName">Nom du signataire</Label>
          <input
            id="signerName"
            type="text"
            value={signerName}
            onChange={(e) => onSignerNameChange(e.target.value)}
            placeholder="Votre nom complet"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label>Signature</Label>
        <div className="border rounded-lg bg-white dark:bg-gray-900">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="w-full touch-none cursor-crosshair rounded-lg"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              const mouseEvent = new MouseEvent("mousedown", {
                clientX: touch.clientX,
                clientY: touch.clientY,
              });
              canvasRef.current?.dispatchEvent(mouseEvent);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY,
              });
              canvasRef.current?.dispatchEvent(mouseEvent);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              const mouseEvent = new MouseEvent("mouseup", {});
              canvasRef.current?.dispatchEvent(mouseEvent);
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          className="w-full"
        >
          <X className="mr-2 h-4 w-4" />
          Effacer la signature
        </Button>
        {value && (
          <p className="text-xs text-muted-foreground">
            ✓ Signature enregistrée
          </p>
        )}
      </div>
    </div>
  );
};

