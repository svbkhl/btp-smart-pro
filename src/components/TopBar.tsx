import { useState } from "react";
import { Menu, X, Sparkles, UserCog, ShieldCheck, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { isSystemAdmin } from "@/config/admin";
import { useAdminImpersonation } from "@/contexts/AdminImpersonationContext";
import { useCurrentUserDisplayName } from "@/hooks/useCurrentUserDisplayName";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Notifications } from "@/components/Notifications";
import { GlobalSearchWrapper } from "@/components/GlobalSearchWrapper";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useNavigate, Link } from "react-router-dom";
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
  const { user, isCloser } = useAuth();
  const { isOwner } = usePermissions();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const { fakeDataEnabled } = useFakeDataStore();
  const { isVisible, setIsVisible } = useSidebar();
  const { requestReplay } = useOnboardingReplay();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const {
    isImpersonating,
    impersonatedCompanyId,
    impersonatedCompanyName,
    companies,
    isLoadingCompanies,
    fetchCompanies,
    startImpersonation,
    stopImpersonation,
  } = useAdminImpersonation();

  const isPlatformAdmin = user && isSystemAdmin(user);

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
      {/* Bannière impersonation admin */}
      <AnimatePresence>
        {isImpersonating && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full px-3 sm:px-4 md:px-6 pt-2 pb-1"
          >
            <div className="flex items-center justify-between w-full bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-medium">
                <Eye className="w-4 h-4 flex-shrink-0" />
                <span>Vue admin : <strong>{impersonatedCompanyName}</strong></span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopImpersonation}
                className="h-7 text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 gap-1.5"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Quitter
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge Mode Démo — masqué pour les closers (ils ont toujours les données fictives) */}
      <AnimatePresence>
        {fakeDataEnabled && !isCloser && (
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
          {/* Bouton Espace Closer → page des 4 actions (/closer/actions) */}
          {isCloser && (
            <Link to="/closer/actions">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 text-xs sm:text-sm px-2.5 sm:px-3 flex-shrink-0"
              >
                <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Espace Closer</span>
                <span className="sm:hidden">Closer</span>
              </Button>
            </Link>
          )}

          {/* Search Bar */}
          <div className="flex-initial sm:max-w-xs min-w-0">
            <GlobalSearchWrapper query={searchQuery} onQueryChange={setSearchQuery} />
          </div>

          {/* Espace admin plateforme — boutons visibles uniquement sur desktop */}
          {isPlatformAdmin && !isCloser && (
            <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
              <Link to="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 text-xs sm:text-sm px-2.5 sm:px-3 flex-shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Admin</span>
                </Button>
              </Link>

              {/* Picker vue client */}
              <DropdownMenu
                open={showCompanyPicker}
                onOpenChange={(open) => {
                  setShowCompanyPicker(open);
                  if (open && companies.length === 0) fetchCompanies();
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 rounded-xl text-xs sm:text-sm px-2.5 sm:px-3 flex-shrink-0 ${
                      isImpersonating
                        ? "border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                        : "border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{isImpersonating ? impersonatedCompanyName : "Vue client"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Voir l’app comme un client
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingCompanies ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Chargement...</div>
                  ) : companies.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Aucune entreprise trouvée</div>
                  ) : (
                    companies.map((company) => (
                      <DropdownMenuItem
                        key={company.id}
                        onClick={() => startImpersonation(company.id, company.name)}
                        className={`cursor-pointer ${impersonatedCompanyId === company.id ? "font-semibold text-purple-600 dark:text-purple-400" : ""}`}
                      >
                        <Building2 className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        {company.name || company.id.slice(0, 8)}
                      </DropdownMenuItem>
                    ))
                  )}
                  {isImpersonating && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={stopImpersonation} className="text-red-600 cursor-pointer">
                        <EyeOff className="w-3.5 h-3.5 mr-2" />
                        Quitter le mode vue client
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

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
              <DropdownMenuContent align="end" className="w-64">
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

                {/* Actions admin — visibles sur mobile via ce menu */}
                {isPlatformAdmin && !isCloser && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Admin plateforme
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <ShieldCheck className="w-4 h-4 mr-2 text-amber-500" />
                      Dashboard admin
                    </DropdownMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            if (companies.length === 0) fetchCompanies();
                          }}
                          className={`cursor-pointer ${isImpersonating ? "text-purple-600 dark:text-purple-400 font-medium" : ""}`}
                        >
                          <Building2 className="w-4 h-4 mr-2 text-purple-500" />
                          {isImpersonating ? `Vue : ${impersonatedCompanyName}` : "Vue client..."}
                        </DropdownMenuItem>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="left" align="start" className="w-60 max-h-80 overflow-y-auto">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Choisir un client</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isLoadingCompanies ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Chargement...</div>
                        ) : companies.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Aucune entreprise</div>
                        ) : (
                          companies.map((company) => (
                            <DropdownMenuItem
                              key={company.id}
                              onClick={() => startImpersonation(company.id, company.name)}
                              className={`cursor-pointer ${impersonatedCompanyId === company.id ? "font-semibold text-purple-600 dark:text-purple-400" : ""}`}
                            >
                              <Building2 className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                              {company.name || company.id.slice(0, 8)}
                            </DropdownMenuItem>
                          ))
                        )}
                        {isImpersonating && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={stopImpersonation} className="text-red-600 cursor-pointer">
                              <EyeOff className="w-3.5 h-3.5 mr-2" />
                              Quitter vue client
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

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

