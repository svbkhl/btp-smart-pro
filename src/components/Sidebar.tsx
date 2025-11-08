import { Home, FolderKanban, Users, BarChart3, Settings, LogOut, Menu, X, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { Notifications } from "./Notifications";

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: Home },
  { name: "Chantiers", href: "/projects", icon: FolderKanban },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Statistiques", href: "/stats", icon: BarChart3 },
  { name: "IA", href: "/ai", icon: Sparkles },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

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
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">B</span>
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">BTP Smart Pro</span>
          </div>
          <Notifications />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
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
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </Button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
