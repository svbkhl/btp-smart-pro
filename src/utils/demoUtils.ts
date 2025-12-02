import { useDemoMode } from "@/hooks/useDemoMode";

/**
 * Hook pour bloquer les actions en mode démo
 * En mode démo, toutes les actions sont autorisées (retourne toujours false)
 */
export const useDemoBlock = () => {
  const { isDemoMode } = useDemoMode();

  const blockAction = (actionName?: string) => {
    // En mode démo, ne jamais bloquer les actions
    return false;
  };

  return { isDemoMode, blockAction };
};

/**
 * Wrapper pour désactiver un bouton/élément en mode démo
 * En mode démo, tous les éléments sont activés
 */
export const DemoDisabled = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  // En mode démo, ne jamais désactiver les éléments
  return <>{children}</>;
};

