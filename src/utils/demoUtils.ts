import { useDemoMode } from "@/hooks/useDemoMode";
import { useToast } from "@/components/ui/use-toast";

/**
 * Hook pour bloquer les actions en mode démo
 * Affiche un toast et retourne true si l'action doit être bloquée
 */
export const useDemoBlock = () => {
  const { isDemoMode } = useDemoMode();
  const { toast } = useToast();

  const blockAction = (actionName?: string) => {
    if (isDemoMode) {
      toast({
        title: "Mode démo",
        description: actionName 
          ? `${actionName} est désactivé en mode démonstration. Créez un compte pour accéder à toutes les fonctionnalités.`
          : "Cette fonctionnalité est désactivée en mode démonstration. Créez un compte pour accéder à toutes les fonctionnalités.",
        variant: "default",
      });
      return true;
    }
    return false;
  };

  return { isDemoMode, blockAction };
};

/**
 * Wrapper pour désactiver un bouton/élément en mode démo
 */
export const DemoDisabled = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const { isDemoMode } = useDemoMode();
  
  if (isDemoMode) {
    return (
      <div className={`opacity-60 cursor-not-allowed ${className}`} style={{ pointerEvents: 'none' }}>
        {children}
      </div>
    );
  }
  
  return <>{children}</>;
};

