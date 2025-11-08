import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

export const AIQuoteGenerator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    surface: "",
    workType: "",
    materials: "",
  });
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-quote", {
        body: {
          clientName: formData.clientName,
          surface: parseFloat(formData.surface),
          workType: formData.workType,
          materials: formData.materials.split(",").map((m) => m.trim()),
        },
      });

      if (error) throw error;

      setResult(data.aiResponse);
      toast({
        title: "Devis généré !",
        description: "Le devis a été créé avec succès par l'IA.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Générer un devis avec l'IA
          </CardTitle>
          <CardDescription>
            L'IA analysera vos données pour créer un devis détaillé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surface">Surface (m²)</Label>
              <Input
                id="surface"
                type="number"
                value={formData.surface}
                onChange={(e) =>
                  setFormData({ ...formData, surface: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workType">Type de travaux</Label>
              <Input
                id="workType"
                value={formData.workType}
                onChange={(e) =>
                  setFormData({ ...formData, workType: e.target.value })
                }
                placeholder="Ex: Rénovation toiture"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="materials">Matériaux (séparés par virgule)</Label>
              <Textarea
                id="materials"
                value={formData.materials}
                onChange={(e) =>
                  setFormData({ ...formData, materials: e.target.value })
                }
                placeholder="Ex: Tuiles, Isolation, Charpente"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer le devis
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Résultat</CardTitle>
            <CardDescription>Devis généré par l'IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Coût estimé: {result.estimatedCost}€
              </h3>
              <p className="text-sm text-muted-foreground">
                Durée: {result.estimatedDuration}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Étapes de travaux:</h4>
              <ul className="space-y-2">
                {result.workSteps?.map((step: any, idx: number) => (
                  <li key={idx} className="text-sm">
                    <strong>{step.step}:</strong> {step.description} ({step.cost}€)
                  </li>
                ))}
              </ul>
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
