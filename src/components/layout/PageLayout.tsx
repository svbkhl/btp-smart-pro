import { ReactNode } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useSidebar } from "@/contexts/SidebarContext";
import { useDecorativeBackground } from "@/contexts/DecorativeBackgroundContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  const { isPinned, isVisible, isHovered } = useSidebar();
  const { enabled: decorativeBackgroundEnabled } = useDecorativeBackground();
  // Désactiver la détection mobile - toujours considérer comme desktop
  const isMobile = false;
  
  // Calculer si la sidebar prend de l'espace
  const sidebarVisible = isPinned || isVisible || isHovered;
  const sidebarWidth = 288; // w-72 = 288px

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background (optionnel) */}
      {decorativeBackgroundEnabled && <AnimatedBackground />}
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <motion.main
        className="relative z-10 flex flex-col overflow-hidden"
        animate={{
          marginLeft: sidebarVisible ? sidebarWidth : 0,
          width: sidebarVisible 
            ? `calc(100% - ${sidebarWidth}px)` 
            : "100%",
        }}
        transition={{ 
          type: "spring", 
          stiffness: 1200, 
          damping: 32,
          mass: 0.15
        }}
      >
        {/* TopBar */}
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
      </motion.main>
    </div>
  );
};

