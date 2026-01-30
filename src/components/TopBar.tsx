import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
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

export const TopBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { fakeDataEnabled } = useFakeDataStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Si on est en mode démo, rediriger vers le formulaire d'essai
    const fakeDataEnabled = useFakeDataStore((state) => state.fakeDataEnabled);
    if (fakeDataEnabled) {
      navigate("/?openTrialForm=true");
    } else {
      navigate("/auth");
    }
  };

  const userInitials = user?.user_metadata?.prenom?.[0] && user?.user_metadata?.nom?.[0]
    ? `${user.user_metadata.prenom[0]}${user.user_metadata.nom[0]}`
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
            className="w-full px-6 pt-2 pb-1"
          >
            <Badge 
              variant="outline" 
              className="w-full justify-center bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-400 backdrop-blur-sm py-1.5 text-sm font-medium"
            >
              🎭 MODE DÉMO ACTIVÉ - Données fictives uniquement
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-end gap-3 p-6">
        {/* Right Actions - Serrés vers la droite avec recherche */}
        <div className="flex items-center gap-2 w-auto">
          {/* Search Bar */}
          <div className="flex-initial max-w-xs min-w-0">
            <GlobalSearchWrapper query={searchQuery} onQueryChange={setSearchQuery} />
          </div>

          {/* Theme Toggle */}
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>

          {/* Notifications */}
          <div className="flex-shrink-0">
            <Notifications />
          </div>

          {/* Profile Dropdown */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-xl"
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
                    {user?.user_metadata?.prenom && user?.user_metadata?.nom
                      ? `${user.user_metadata.prenom} ${user.user_metadata.nom}`
                      : user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
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

