import { useLocation } from "react-router-dom";

/**
 * Hook pour détecter si on est en mode démo
 * Le mode démo est activé quand on est sur /demo ou n'importe quelle route en mode démo
 */
export const useDemoMode = () => {
  const location = useLocation();
  const isDemoMode = location.pathname.startsWith("/demo") || 
                     location.pathname === "/demo" ||
                     // Permettre la navigation depuis /demo vers d'autres pages en mode démo
                     (sessionStorage.getItem("demo_mode") === "true");
  
  return {
    isDemoMode,
    enableDemoMode: () => sessionStorage.setItem("demo_mode", "true"),
    disableDemoMode: () => sessionStorage.removeItem("demo_mode"),
  };
};

