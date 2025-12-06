import { useEffect } from "react";
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
  const { isDemoActive, deactivateDemo } = useLandingDemoStore();
  const { setFakeDataEnabled, fakeDataEnabled } = useFakeDataStore();

  useEffect(() => {
    // Si un utilisateur est connecté
    if (!loading && user) {
      // Désactiver le mode démo de la landing page
      if (isDemoActive) {
        console.log("🔒 Utilisateur connecté détecté - Désactivation du mode démo landing");
        deactivateDemo();
      }
      
      // Désactiver le fake data UNIQUEMENT si l'utilisateur n'est PAS administrateur
      // Les administrateurs peuvent activer le mode démo manuellement
      if (fakeDataEnabled && userRole !== 'admin') {
        console.log("🔒 Désactivation du mode fake data - Utilisateur non-admin connecté");
        setFakeDataEnabled(false);
      } else if (fakeDataEnabled && userRole === 'admin') {
        console.log("✅ Mode démo maintenu - Utilisateur administrateur");
      }
    }
    
    // Si aucun utilisateur n'est connecté et que le mode démo n'est pas actif, désactiver le fake data
    if (!loading && !user && !isDemoActive && fakeDataEnabled) {
      console.log("🔒 Désactivation du mode fake data - Mode démo non actif");
      setFakeDataEnabled(false);
    }
  }, [user, loading, userRole, isDemoActive, fakeDataEnabled, deactivateDemo, setFakeDataEnabled]);

  // Ce composant ne rend rien, il surveille juste la connexion
  return null;
};

