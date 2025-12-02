import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const DemoModeSettings = () => {
  const { fakeDataEnabled, setFakeDataEnabled } = useFakeDataStore();
  const { userRole } = useAuth();
  const { toast } = useToast();

  // Seuls les administrateurs peuvent accéder à cette section
  if (userRole !== 'administrateur') {
    return null;
  }

  const handleToggle = (enabled: boolean) => {
    setFakeDataEnabled(enabled);
    toast({
      title: enabled ? "Mode démo activé" : "Mode démo désactivé",
      description: enabled 
        ? "Le mode démo est maintenant actif. Vous verrez des données fictives dans toute l'application."
        : "Le mode démo est désactivé. Vous verrez maintenant vos vraies données.",
    });
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Mode démo</h3>
              <p className="text-sm text-muted-foreground">
                Activez le mode démo pour tester l'application avec des données fictives
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div className="space-y-0.5">
              <Label htmlFor="demo-mode" className="text-base font-medium">
                Activer le mode démo
              </Label>
              <p className="text-sm text-muted-foreground">
                Afficher des données fictives dans toute l'application
              </p>
            </div>
            <Switch
              id="demo-mode"
              checked={fakeDataEnabled}
              onCheckedChange={handleToggle}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              Le mode démo est uniquement accessible aux administrateurs. 
              Lorsque le mode démo est activé, toutes les pages afficheront des données fictives 
              au lieu de vos vraies données. Cela vous permet de tester l'application sans affecter 
              vos données réelles.
            </AlertDescription>
          </Alert>
        </div>
      </GlassCard>
    </div>
  );
};




