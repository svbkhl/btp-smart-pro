import { ReactNode } from "react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/TopBar";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useDecorativeBackground } from "@/contexts/DecorativeBackgroundContext";

interface EmployeePageLayoutProps {
  children: ReactNode;
}

/**
 * Layout spécial pour les employés - SANS SIDEBAR
 * - TopBar avec paramètres en haut à droite
 * - Contenu pleine largeur
 * - Interface simplifiée et claire
 */
export const EmployeePageLayout = ({ children }: EmployeePageLayoutProps) => {
  const { enabled: decorativeBackgroundEnabled } = useDecorativeBackground();

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background (optionnel) */}
      {decorativeBackgroundEnabled && <AnimatedBackground />}
      
      {/* Main Content Area - PLEINE LARGEUR (pas de sidebar) */}
      <main className="relative z-10 flex flex-col w-full overflow-hidden">
        {/* TopBar avec paramètres */}
        <TopBar />
        
        {/* Page Content with transition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto"
          style={{ willChange: "transform, opacity" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
