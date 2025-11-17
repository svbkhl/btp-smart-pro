import { ReactNode } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * Composant qui permet l'accès aux pages en mode démo
 * Active automatiquement le mode démo si on vient de /demo
 */
export const DemoRoute = ({ children }: { children: ReactNode }) => {
  const { isDemoMode, enableDemoMode } = useDemoMode();
  const location = useLocation();

  useEffect(() => {
    // Si on vient de /demo ou si le mode démo est déjà activé, le maintenir
    if (sessionStorage.getItem("demo_mode") === "true" || location.pathname === "/demo") {
      enableDemoMode();
    }
  }, [location.pathname, enableDemoMode]);

  // En mode démo, permettre l'accès sans authentification
  if (isDemoMode) {
    return <>{children}</>;
  }

  // Sinon, rediriger vers /demo
  return <>{children}</>;
};

