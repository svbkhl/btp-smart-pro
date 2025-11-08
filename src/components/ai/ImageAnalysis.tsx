import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ImageAnalysis = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [analysisType, setAnalysisType] = useState<"wall" | "roof" | "general">("general");
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!imageUrl) {
      toast({
        title: "Erreur",
        description: "Veuillez fournir une URL d'image",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: {
          imageUrl,
          analysisType,
        },
      });

      if (error) throw error;

      setResult(data.analysis);
      toast({
        title: "Analyse terminée !",
        description: "L'IA a analysé l'image avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'analyser l'image",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Analyse d'image par IA
          </CardTitle>
          <CardDescription>
            Détectez automatiquement les défauts sur vos photos de chantier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL de l'image</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysisType">Type d'analyse</Label>
            <Select
              value={analysisType}
              onValueChange={(value: any) => setAnalysisType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Générale</SelectItem>
                <SelectItem value="wall">Mur</SelectItem>
                <SelectItem value="roof">Toiture</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {imageUrl && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={imageUrl}
                alt="Image à analyser"
                className="w-full h-48 object-cover"
                onError={() => {
                  toast({
                    title: "Erreur",
                    description: "Impossible de charger l'image",
                    variant: "destructive",
                  });
                }}
              />
            </div>
          )}

          <Button onClick={handleAnalyze} className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Analyser l'image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Résultats de l'analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={getSeverityColor(result.severity)}>
                Sévérité: {result.severity}
              </Badge>
              <Badge variant={getSeverityColor(result.urgency)}>
                Urgence: {result.urgency}
              </Badge>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2">
                Coût estimé: {result.estimatedCost}€
              </h4>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Défauts détectés:</h4>
              <ul className="list-disc list-inside space-y-1">
                {result.defects?.map((defect: string, idx: number) => (
                  <li key={idx} className="text-sm">
                    {defect}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Détails:</h4>
              <p className="text-sm text-muted-foreground">{result.details}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Recommandations:</h4>
              <ul className="list-disc list-inside space-y-1">
                {result.recommendations?.map((rec: string, idx: number) => (
                  <li key={idx} className="text-sm">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
