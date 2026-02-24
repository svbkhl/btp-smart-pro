import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLandingDemoStore } from "@/store/useLandingDemoStore";
import { useFakeDataStore } from "@/store/useFakeDataStore";

/**
 * Composant guard qui désactive automatiquement le mode démo
 * dès qu'un utilisateur non-admin se connecte
 * Les administrateurs peuvent activer/désactiver le mode démo manuellement
 */
export const DemoModeGuard = () => {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();
  const { isDemoActive, deactivateDemo } = useLandingDemoStore();
  const { setFakeDataEnabled, fakeDataEnabled } = useFakeDataStore();

  useEffect(() => {
    // Ne jamais désactiver le mode démo si on est sur la page /demo
    if (location.pathname === "/demo") return;

    // Si un utilisateur est connecté
    if (!loading && user) {
      // Désactiver le mode démo de la landing page
      if (isDemoActive) {
        console.log("🔒 Utilisateur connecté détecté - Désactivation du mode démo landing");
        deactivateDemo();
      }
      
      // Désactiver le fake data UNIQUEMENT si l'utilisateur n'est PAS administrateur
      if (fakeDataEnabled && userRole !== 'admin') {
        console.log("🔒 Désactivation du mode fake data - Utilisateur non-admin connecté");
        setFakeDataEnabled(false);
      }
    }
    
    // Si aucun utilisateur n'est connecté et que le mode démo n'est pas actif, désactiver le fake data
    if (!loading && !user && !isDemoActive && fakeDataEnabled) {
      console.log("🔒 Désactivation du mode fake data - Mode démo non actif");
      setFakeDataEnabled(false);
    }
  }, [user, loading, userRole, isDemoActive, fakeDataEnabled, deactivateDemo, setFakeDataEnabled, location.pathname]);

  return null;
};

