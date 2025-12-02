import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLandingDemoStore } from "@/store/useLandingDemoStore";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import Dashboard from "@/pages/Dashboard";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Composant qui affiche le mode Démo intégré dans la landing page
 * Disparaît automatiquement si l'utilisateur se connecte
 */
export const LandingDemo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoActive, deactivateDemo } = useLandingDemoStore();
  const { setFakeDataEnabled } = useFakeDataStore();

  // Si l'utilisateur se connecte, désactiver le mode démo et rediriger
  useEffect(() => {
    if (user) {
      console.log("🔒 Connexion détectée dans LandingDemo - Désactivation et redirection");
      deactivateDemo();
      setFakeDataEnabled(false);
      // Rediriger vers le dashboard réel
      navigate("/dashboard", { replace: true });
    }
  }, [user, deactivateDemo, setFakeDataEnabled, navigate]);

  // Activer le mode fake data UNIQUEMENT quand le démo est actif ET que l'utilisateur n'est pas connecté
  useEffect(() => {
    if (isDemoActive && !user) {
      console.log("🎮 Activation du mode fake data pour le mode démo");
      setFakeDataEnabled(true);
    } else {
      // Désactiver le fake data si le démo n'est plus actif OU si l'utilisateur se connecte
      if (isDemoActive && user) {
        console.log("🔒 Désactivation du mode fake data - Utilisateur connecté");
      }
      setFakeDataEnabled(false);
    }
  }, [isDemoActive, user, setFakeDataEnabled]);

  // Si pas de démo actif ou utilisateur connecté, ne rien afficher
  if (!isDemoActive || user) {
    return null;
  }

  // Afficher le dashboard en mode démo
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Bannière de mode démo */}
      <div className="sticky top-0 z-50 bg-primary/10 border-b border-primary/20 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary/20 rounded-full text-sm font-medium text-primary">
              Mode Démo
            </span>
            <span className="text-sm text-muted-foreground">
              Explorez l'application avec des données de démonstration
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              deactivateDemo();
              setFakeDataEnabled(false);
              navigate("/");
            }}
            className="gap-2 rounded-xl"
          >
            <X className="w-4 h-4" />
            Quitter la démo
          </Button>
        </div>
      </div>
      <PageLayout>
        <Dashboard />
      </PageLayout>
    </div>
  );
};

