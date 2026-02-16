import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUserDisplayName } from "@/hooks/useCurrentUserDisplayName";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Notifications } from "@/components/Notifications";
import { GlobalSearchWrapper } from "@/components/GlobalSearchWrapper";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/contexts/SidebarContext";
import { useOnboardingReplay } from "@/contexts/OnboardingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";

export const TopBar = () => {
  const { user } = useAuth();
  const { isOwner } = usePermissions();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { fakeDataEnabled } = useFakeDataStore();
  const { isVisible, setIsVisible } = useSidebar();
  const { requestReplay } = useOnboardingReplay();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Si on est en mode démo, rediriger vers l'accueil
    const fakeDataEnabled = useFakeDataStore((state) => state.fakeDataEnabled);
    if (fakeDataEnabled) {
      navigate("/");
    } else {
      navigate("/auth");
    }
  };

  const { firstName, lastName } = useCurrentUserDisplayName();
  
  const userInitials = firstName?.[0] && lastName?.[0]
    ? `${firstName[0]}${lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="sticky top-0 z-30 bg-transparent backdrop-blur-none">
      {/* Badge Mode Démo */}
      <AnimatePresence>
        {fakeDataEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full px-3 sm:px-4 md:px-6 pt-2 pb-1"
          >
            <Badge 
              variant="outline" 
              className="w-full justify-center bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-400 backdrop-blur-sm py-1.5 text-xs sm:text-sm font-medium"
            >
              🎭 MODE DÉMO ACTIVÉ - Données fictives uniquement
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-end gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-6">
        {/* Mobile Hamburger Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </Button>
        )}
        {/* Right Actions - Serrés vers la droite avec recherche */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 ml-auto">
          {/* Search Bar */}
          <div className="flex-initial sm:max-w-xs min-w-0">
            <GlobalSearchWrapper query={searchQuery} onQueryChange={setSearchQuery} />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 min-w-0">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Notifications />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {firstName && lastName
                        ? `${firstName} ${lastName}`
                        : user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => {
                      requestReplay();
                      toast({ title: "Guide affiché", description: "Le guide de bienvenue s'affiche." });
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Revoir le guide
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

