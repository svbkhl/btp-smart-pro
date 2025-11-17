import { Home, FolderKanban, Users, BarChart3, Settings, LogOut, Menu, X, Sparkles, Calendar, FileText, UserCheck, Briefcase, Database, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { Notifications } from "./Notifications";
import { ThemeToggle } from "./ThemeToggle";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useDemoMode } from "@/hooks/useDemoMode";

// Navigation pour les admins/dirigeants
const adminNavigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: Home },
  { name: "Chantiers", href: "/projects", icon: FolderKanban },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Devis", href: "/quotes", icon: FileText },
  { name: "Calendrier", href: "/calendar", icon: Calendar },
  { name: "Gestion Employés", href: "/admin/employees", icon: UserCheck },
  { name: "Planning Employés", href: "/employees-planning", icon: Calendar },
  { name: "RH", href: "/rh/dashboard", icon: Briefcase },
  { name: "Statistiques", href: "/stats", icon: BarChart3 },
  { name: "IA", href: "/ai", icon: Sparkles },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

// Navigation pour les employés
const employeeNavigation = [
  { name: "Mon Planning", href: "/my-planning", icon: Calendar },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, isAdmin, isEmployee } = useAuth();
  const { fakeDataEnabled, toggleFakeData } = useFakeDataStore();
  const { isDemoMode, enableDemoMode } = useDemoMode();
  
  // Activer le mode démo si on est sur /demo
  useEffect(() => {
    if (location.pathname === "/demo") {
      enableDemoMode();
    }
  }, [location.pathname, enableDemoMode]);
  
  // Sélectionner la navigation selon le rôle ou mode démo
  const navigation = isDemoMode ? adminNavigation : (isAdmin ? adminNavigation : (isEmployee ? employeeNavigation : adminNavigation));

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // En mode démo, permettre la navigation vers toutes les pages sauf /auth
    if (isDemoMode && href === "/auth") {
      e.preventDefault();
    }
    // Activer le mode démo pour toutes les navigations depuis /demo
    if (location.pathname === "/demo" && href !== "/auth") {
      enableDemoMode();
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-background shadow-md md:hidden"
          onClick={toggleSidebar}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40",
          isMobile ? "fixed w-64" : "w-64",
          isMobile && !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-6">
          <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">B</span>
          </div>
            <span className="font-bold text-lg text-sidebar-foreground">BTP Smart Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50" />
            <Notifications />
          </div>
        </div>

        {/* Fake Data Toggle - Masqué en mode démo */}
        {!isDemoMode && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-sidebar-accent/30">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Database className="h-4 w-4 text-sidebar-foreground flex-shrink-0" />
                <Label htmlFor="fake-data-toggle" className="text-xs font-medium text-sidebar-foreground cursor-pointer truncate">
                  Fake Data
                </Label>
              </div>
              <Switch
                id="fake-data-toggle"
                checked={fakeDataEnabled}
                onCheckedChange={toggleFakeData}
                className="flex-shrink-0"
              />
            </div>
            <p className="text-[10px] text-sidebar-foreground/70 mt-1 px-2">
              {fakeDataEnabled ? "ON" : "OFF"}
            </p>
          </div>
        )}
        
        {/* Badge démo */}
        {isDemoMode && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/20">
              <ShieldCheck className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="text-xs font-medium text-sidebar-foreground">Mode démo</span>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (isDemoMode && location.pathname === item.href);
            // En mode démo, permettre la navigation vers toutes les pages sauf /auth
            const isDisabled = isDemoMode && item.href === "/auth";
            
            if (isDisabled) {
              return (
                <div
                  key={item.name}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-not-allowed opacity-50",
                    "text-sidebar-foreground"
                  )}
                  title="Fonctionnalité désactivée en mode démo"
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </div>
              );
            }
            
            // En mode démo, préfixer les routes avec /demo ou utiliser les routes normales
            const href = isDemoMode && item.href !== "/demo" && item.href !== "/auth" 
              ? item.href 
              : item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          {isDemoMode ? (
            <Link to="/auth" className="w-full">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <LogOut className="h-5 w-5" />
                Créer un compte
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={signOut}
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
