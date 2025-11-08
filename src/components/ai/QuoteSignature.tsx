import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileSignature, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const QuoteSignature = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [signerName, setSignerName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("ai_quotes")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les devis",
        variant: "destructive",
      });
      return;
    }

    setQuotes(data || []);
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
    if (!selectedQuote || !signerName.trim()) {
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

      const { error } = await supabase.functions.invoke("sign-quote", {
        body: {
          quoteId: selectedQuote.id,
          signatureData,
          signerName: signerName.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Devis signé !",
        description: "Le devis a été signé avec succès.",
      });

      setSelectedQuote(null);
      setSignerName("");
      clearSignature();
      loadQuotes();
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Signature de devis</h2>
        <p className="text-muted-foreground">
          Sélectionnez un devis et signez-le électroniquement
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Devis en attente</CardTitle>
            <CardDescription>Sélectionnez un devis à signer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun devis en attente de signature
              </p>
            ) : (
              quotes.map((quote) => (
                <div
                  key={quote.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedQuote?.id === quote.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedQuote(quote)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{quote.client_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {quote.work_type}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {quote.estimated_cost?.toLocaleString("fr-FR")} €
                      </p>
                    </div>
                    <Badge variant="secondary">À signer</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {selectedQuote && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Signature électronique
              </CardTitle>
              <CardDescription>
                Signez le devis pour {selectedQuote.client_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  className="w-full"
                >
                  Effacer la signature
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleSign}
                  disabled={loading || !signerName.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signature en cours...
                    </>
                  ) : (
                    <>
                      <FileSignature className="mr-2 h-4 w-4" />
                      Signer le devis
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
