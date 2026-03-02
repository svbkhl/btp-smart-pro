import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLandingDemoStore } from "@/store/useLandingDemoStore";
import { useFakeDataStore } from "@/store/useFakeDataStore";

/**
 * Composant guard qui désactive automatiquement le mode démo
 * dès qu'un utilisateur non-admin/closer se connecte
 */
export const DemoModeGuard = () => {
  const { user, loading, userRole, isCloser, isCloserLoading } = useAuth();
  const location = useLocation();
  const { isDemoActive, deactivateDemo } = useLandingDemoStore();
  const { setFakeDataEnabled, fakeDataEnabled } = useFakeDataStore();

  useEffect(() => {
    if (location.pathname === "/demo") return;

    if (!loading && user) {
      if (isDemoActive) {
        console.log("🔒 Utilisateur connecté détecté - Désactivation du mode démo landing");
        deactivateDemo();
      }
      // Attendre que le check closer soit terminé avant de désactiver fakeData
      if (fakeDataEnabled && userRole !== 'admin' && !isCloser && !isCloserLoading) {
        console.log("🔒 Désactivation du mode fake data - Utilisateur non-admin/closer connecté");
        setFakeDataEnabled(false);
      }
    }

    if (!loading && !user && !isDemoActive && fakeDataEnabled) {
      console.log("🔒 Désactivation du mode fake data - Mode démo non actif");
      setFakeDataEnabled(false);
    }
  }, [user, loading, userRole, isCloser, isCloserLoading, isDemoActive, fakeDataEnabled, deactivateDemo, setFakeDataEnabled, location.pathname]);

  return null;
};
