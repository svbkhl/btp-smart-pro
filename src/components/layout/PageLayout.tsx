import { ReactNode, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useSidebar } from "@/contexts/SidebarContext";
import { useDecorativeBackground } from "@/contexts/DecorativeBackgroundContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";
import { isSystemAdmin, isAdminEmail } from "@/config/admin";
interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { isPinned, isVisible, isHovered } = useSidebar();
  const { enabled: decorativeBackgroundEnabled } = useDecorativeBackground();
  const isMobile = useIsMobile();
  const { showOnboarding, completeOnboarding, isReplay } = useOnboarding();

  // Vérification centralisée + email en dur : guide jamais affiché pour l'admin
  const isAdminSystem = isSystemAdmin(user);
  const isAdminByEmail = isAdminEmail(user?.email);
  const neverShowGuide = !!isAdmin || !!isAdminSystem || !!isAdminByEmail;

  useEffect(() => {
    if (neverShowGuide && searchParams.has("onboarding_step")) {
      const next = new URLSearchParams(searchParams);
      next.delete("onboarding_step");
      setSearchParams(next, { replace: true });
    }
  }, [neverShowGuide, searchParams, setSearchParams]);

  const handleOnboardingComplete = () => {
    completeOnboarding(isReplay);
    if (searchParams.has("onboarding_step")) {
      const next = new URLSearchParams(searchParams);
      next.delete("onboarding_step");
      setSearchParams(next, { replace: true });
    }
  };

  // Calculer si la sidebar prend de l'espace
  const sidebarVisible = isMobile ? false : (isPinned || isVisible || isHovered);
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
          marginLeft: !isMobile && sidebarVisible ? sidebarWidth : 0,
          width: !isMobile && sidebarVisible 
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

      {/* Guide de première connexion (une seule fois) — jamais pour l'admin */}
      {showOnboarding && !neverShowGuide && (
        <OnboardingTour
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      )}
    </div>
  );
};

