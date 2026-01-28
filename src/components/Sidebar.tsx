import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  FolderKanban, 
  Calendar,
  Mail,
  Brain,
  Settings,
  BarChart3,
  BookText,
  Bell,
  Sparkles,
  Briefcase,
  UserCircle,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  ShieldCheck,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/contexts/SidebarContext";
import { useCompany } from "@/hooks/useCompany";
import { isFeatureEnabled } from "@/utils/companyFeatures";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useQueryClient } from "@tanstack/react-query";

// Types pour les items de menu
type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  subItems?: Array<{ label: string; path: string }>;
  feature?: string | null; // Feature requise pour afficher cet item
};

type MenuGroup = {
  items: MenuItem[];
};

// Structure de base des menu items par groupes avec mapping des features
const baseMenuGroups: Array<{ items: Array<MenuItem & { feature?: string | null }> }> = [
  {
    items: [
      // 1️⃣ Tableau de bord (toujours visible)
      { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard", feature: null },
    ],
  },
  {
    items: [
      // 3️⃣ Clients (toujours visible)
      { icon: Users, label: "Clients", path: "/clients", feature: null },
    ],
  },
  {
    items: [
      // 4️⃣ Chantiers (Projets / Interventions)
      { icon: FolderKanban, label: "Chantiers", path: "/projects", feature: "projets" },
    ],
  },
  {
    items: [
      // 5️⃣ Calendrier (planning)
      { icon: Calendar, label: "Calendrier", path: "/calendar", feature: "planning" },
    ],
  },
  {
    items: [
      // 6️⃣ Employés & RH
      { icon: UserCircle, label: "Employés & RH", path: "/employees-rh", feature: "employes" },
    ],
  },
  {
    items: [
      // 7️⃣ IA (Assistant)
      { icon: Brain, label: "IA", path: "/ai", feature: "ia_assistant" },
    ],
  },
  {
    items: [
      // 8️⃣ Facturation
      { icon: FileText, label: "Facturation", path: "/facturation", feature: "facturation" },
    ],
  },
  {
    items: [
      // 9️⃣ Messagerie (toujours visible)
      { icon: Mail, label: "Messagerie", path: "/messaging", feature: null },
    ],
  },
];

// Fonction pour filtrer les menu items selon les features
const getMenuGroups = (company: ReturnType<typeof useCompany>["data"]): MenuGroup[] => {
  // Si pas de company, afficher tous les items (mode démo ou pas encore configuré)
  if (!company) {
    return baseMenuGroups.map((group) => ({
      items: group.items.map(({ feature, ...item }) => item), // Retirer la propriété feature
    }));
  }
  
  return baseMenuGroups
    .map((group) => ({
      items: group.items
        .filter((item) => {
          // Si pas de feature associée, toujours visible
          if (!item.feature) return true;
          // Sinon, vérifier si la feature est activée
          return isFeatureEnabled(company, item.feature as keyof NonNullable<typeof company>["features"]);
        })
        .map(({ feature, ...item }) => item), // Retirer la propriété feature des items filtrés
    }))
    .filter((group) => group.items.length > 0); // Retirer les groupes vides
};

// Groupe de menu pour les paramètres (toujours visible)
// Note: Les items admin seront ajoutés dynamiquement selon les permissions

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, userRole } = useAuth();
  const { isOwner, can } = usePermissions();
  const queryClient = useQueryClient();
  const fakeDataEnabled = useFakeDataStore((state) => state.fakeDataEnabled);
  const setFakeDataEnabled = useFakeDataStore((state) => state.setFakeDataEnabled);

  // Fonction pour gérer la navigation : rediriger vers formulaire d'essai si pas connecté en mode démo
  const handleNavigation = (path: string, e?: React.MouseEvent) => {
    // Si l'utilisateur n'est pas connecté et qu'on est en mode démo, rediriger vers le formulaire
    if (!user && fakeDataEnabled) {
      e?.preventDefault();
      navigate("/?openTrialForm=true");
      return;
    }
    // Sinon, navigation normale
    navigate(path);
  };
  const isMobile = useIsMobile();
  const { isPinned, isVisible, setIsPinned, setIsVisible, setIsHovered: setGlobalIsHovered } = useSidebar();
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { data: company } = useCompany();
  const menuGroups = getMenuGroups(company);

  // Menu paramètres (uniquement le lien vers Settings)
  const settingsMenuGroup: MenuGroup = {
    items: [
      { icon: Settings, label: "Paramètres", path: "/settings" },
    ],
  };

  // Fonction pour vérifier si un chemin est actif
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  // Initialiser expandedGroups après la définition de isActive
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(() => {
    // Ouvrir automatiquement les groupes qui contiennent la page active
    const expanded: Record<number, boolean> = {};
    const currentPath = location.pathname;
    
    const checkIsActive = (path: string) => {
      if (path === "/dashboard") {
        return currentPath === "/dashboard";
      }
      return currentPath.startsWith(path);
    };
    
    menuGroups.forEach((group, groupIndex) => {
      group.items.forEach((item) => {
        if (item.subItems) {
          const hasActiveSubItem = item.subItems.some(sub => checkIsActive(sub.path));
          if (hasActiveSubItem || checkIsActive(item.path)) {
            expanded[groupIndex] = true;
          }
        }
      });
    });
    return expanded;
  });

  // Fermer la sidebar quand on change de route (sauf si épinglée)
  useEffect(() => {
    // Nettoyer le timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (isMobile) {
      setIsOpen(false);
    } else if (!isPinned) {
      // Sur desktop, fermer la sidebar si pas épinglée
      setIsHovered(false);
      setIsVisible(false);
      setGlobalIsHovered(false);
    }
  }, [location.pathname, isMobile, isPinned, setIsVisible, setGlobalIsHovered]);

  // Initialiser l'état visible selon le pinned
  useEffect(() => {
    if (isMobile) {
      setIsHovered(true);
      setIsVisible(true);
    } else if (isPinned) {
      setIsHovered(true);
      setIsVisible(true);
    } else {
      setIsHovered(false);
      setIsVisible(false);
    }
  }, [isMobile, isPinned, setIsVisible]);

  const toggleGroup = (groupIndex: number) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupIndex]: !prev[groupIndex]
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Si on est en mode démo et pas connecté, rediriger vers le formulaire d'essai
    if (!user && fakeDataEnabled) {
      navigate("/?openTrialForm=true");
    } else {
      navigate("/auth");
    }
  };

  // Ouvrir automatiquement les groupes avec des pages actives
  useEffect(() => {
    menuGroups.forEach((group, groupIndex) => {
      group.items.forEach((item) => {
        if (item.subItems) {
          const hasActiveSubItem = item.subItems.some(sub => isActive(sub.path));
          if (hasActiveSubItem || isActive(item.path)) {
            setExpandedGroups(prev => ({ ...prev, [groupIndex]: true }));
          }
        }
      });
    });
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/30 dark:border-gray-700/40 shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Hover Zone (Desktop) - Zone fine à gauche pour révéler la sidebar */}
      {!isMobile && !isPinned && (
        <motion.div
          className="fixed left-0 top-0 bottom-0 w-2 z-30 group cursor-pointer"
          onMouseEnter={() => {
            // Ouverture immédiate quand on se colle à gauche
            if (!isPinned) {
              setIsHovered(true);
              setIsVisible(true);
              setGlobalIsHovered(true);
            }
          }}
          onMouseLeave={() => {
            // Annuler le timeout si on quitte avant le délai
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
        >
          {/* Indicateur visuel au hover - plus subtil */}
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-transparent via-primary/50 to-transparent rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        </motion.div>
      )}

      {/* Sidebar */}
      <motion.aside
        initial={isMobile ? { x: -320 } : { x: -320 }}
        animate={isMobile 
          ? { x: isOpen ? 0 : -320 }
          : {
              x: isPinned || isHovered ? 0 : -320,
            }
        }
        onMouseEnter={() => {
          if (!isMobile && !isPinned) {
            setIsHovered(true);
            setIsVisible(true);
            setGlobalIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile && !isPinned) {
            setIsHovered(false);
            setIsVisible(false);
            setGlobalIsHovered(false);
          }
        }}
        transition={{ 
          type: "spring", 
          stiffness: 1000, 
          damping: 30, 
          mass: 0.2,
        }}
        className={cn(
          "flex flex-col z-40",
          "bg-white/90 dark:bg-gray-900/90 backdrop-blur-3xl",
          "border border-white/40 dark:border-gray-700/50",
          "shadow-2xl shadow-black/10 dark:shadow-black/30",
          "transition-shadow duration-300 ease-out",
          "hover:shadow-[0_25px_70px_-20px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_25px_70px_-20px_rgba(139,92,246,0.4)]",
          "rounded-2xl",
          isMobile 
            ? "fixed w-80 h-screen" 
            : "fixed w-72 h-[calc(100vh-2rem)] top-4 left-4 bottom-4"
        )}
        style={{ 
          willChange: "transform, box-shadow, opacity",
          pointerEvents: isMobile || isPinned || isHovered ? "auto" : "none"
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 border-b border-white/20 dark:border-gray-700/30"
        >
          {(user || !fakeDataEnabled) ? (
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"
              >
                <span className="text-primary-foreground font-bold text-xl">B</span>
              </motion.div>
              <div>
                <h2 className="text-lg font-bold text-foreground">BTP Smart Pro</h2>
              </div>
            </Link>
          ) : (
            <button 
              onClick={(e) => handleNavigation("/dashboard", e)}
              className="flex items-center gap-3 group w-full text-left"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"
              >
                <span className="text-primary-foreground font-bold text-xl">B</span>
              </motion.div>
              <div>
                <h2 className="text-lg font-bold text-foreground">BTP Smart Pro</h2>
              </div>
            </button>
          )}
        </motion.div>

        {/* Pin/Unpin Button (Desktop) */}
        {!isMobile && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              const newPinned = !isPinned;
              setIsPinned(newPinned);
              if (newPinned) {
                setIsHovered(true);
                setIsVisible(true);
              } else {
                setIsHovered(false);
                setIsVisible(false);
              }
            }}
            className={cn(
              "absolute top-4 right-4 z-50 w-10 h-10 rounded-xl",
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl",
              "border-2 border-white/40 dark:border-gray-700/40",
              "flex items-center justify-center",
              "hover:bg-white dark:hover:bg-gray-700",
              "transition-all duration-200 shadow-lg",
              isPinned 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
            title={isPinned ? "Désépingler (auto-hide activé)" : "Épingler (toujours visible)"}
          >
            {isPinned ? (
              <PinOff className="w-5 h-5" />
            ) : (
              <Pin className="w-5 h-5" />
            )}
          </motion.button>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuGroups.map((group, groupIndex) => {
            let itemIndex = 0;
            // Calculer l'index de départ pour les animations
            for (let i = 0; i < groupIndex; i++) {
              itemIndex += menuGroups[i].items.length;
            }
            
            return (
              <div key={groupIndex} className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const isGroupExpanded = expandedGroups[groupIndex];
                  const active = hasSubItems
                    ? (item.subItems?.some(sub => isActive(sub.path)) || isActive(item.path))
                    : isActive(item.path);
                  const globalIndex = itemIndex + itemIdx;
                  
                  return (
                    <div key={item.path} className="space-y-1">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + globalIndex * 0.03 }}
                        whileHover={{ 
                          scale: 1.05, 
                          x: 8,
                          transition: { duration: 0.2, ease: "easeOut" }
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {hasSubItems ? (
                          <div>
                            <button
                              onClick={() => toggleGroup(groupIndex)}
                              className={cn(
                                "group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                "relative hover:shadow-lg hover:shadow-primary/20",
                                active
                                  ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground shadow-md shadow-blue-500/20"
                                  : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-gray-800/60 hover:scale-105"
                              )}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Icon className={cn(
                                  "w-5 h-5 transition-colors",
                                  active && "text-primary"
                                )} />
                                <span>{item.label}</span>
                              </div>
                              {isGroupExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <AnimatePresence>
                              {isGroupExpanded && item.subItems && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-8 mt-1 space-y-1 pb-1">
                                    {item.subItems.map((subItem) => {
                                      const subActive = isActive(subItem.path);
                                      return (user || !fakeDataEnabled) ? (
                                        <Link
                                          key={subItem.path}
                                          to={subItem.path}
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                            subActive
                                              ? "bg-primary/10 text-primary font-medium"
                                              : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-gray-800/40"
                                          )}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                          {subItem.label}
                                        </Link>
                                      ) : (
                                        <button
                                          key={subItem.path}
                                          onClick={(e) => handleNavigation(subItem.path, e)}
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 w-full text-left",
                                            subActive
                                              ? "bg-primary/10 text-primary font-medium"
                                              : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-gray-800/40"
                                          )}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                          {subItem.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (user || !fakeDataEnabled) ? (
                          <Link
                            to={item.path}
                            className={cn(
                              "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                              "relative hover:shadow-lg hover:shadow-primary/20",
                              active
                                ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground shadow-md shadow-blue-500/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-gray-800/60 hover:scale-105"
                            )}
                          >
                            {active && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl"
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            )}
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="relative z-10"
                            >
                              <Icon className={cn(
                                "w-5 h-5 transition-colors",
                                active && "text-primary"
                              )} />
                            </motion.div>
                            <span className="relative z-10">{item.label}</span>
                          </Link>
                        ) : (
                          <button
                            onClick={(e) => handleNavigation(item.path, e)}
                            className={cn(
                              "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left",
                              "relative hover:shadow-lg hover:shadow-primary/20",
                              active
                                ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground shadow-md shadow-blue-500/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-gray-800/60 hover:scale-105"
                            )}
                          >
                            {active && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl"
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            )}
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="relative z-10"
                            >
                              <Icon className={cn(
                                "w-5 h-5 transition-colors",
                                active && "text-primary"
                              )} />
                            </motion.div>
                            <span className="relative z-10">{item.label}</span>
                          </button>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {/* Paramètres (toujours visible) */}
          {settingsMenuGroup.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ 
                  scale: 1.05, 
                  x: 8,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.95 }}
              >
                {(user || !fakeDataEnabled) ? (
                  <Link
                    to={item.path}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                      "hover:shadow-lg hover:shadow-primary/20",
                      active
                        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground shadow-md shadow-blue-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-gray-800/60 hover:scale-105"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeTabSettings"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="relative z-10"
                    >
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        active && "text-primary"
                      )} />
                    </motion.div>
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={(e) => handleNavigation(item.path, e)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative w-full text-left",
                      "hover:shadow-lg hover:shadow-primary/20",
                      active
                        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-foreground shadow-md shadow-blue-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-gray-800/60 hover:scale-105"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeTabSettings"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="relative z-10"
                    >
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        active && "text-primary"
                      )} />
                    </motion.div>
                    <span className="relative z-10">{item.label}</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </nav>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="p-4 border-t border-white/20 dark:border-gray-700/30 space-y-3"
        >

          {/* User Actions */}
          <div className="pt-2 space-y-1">
            {user ? (
              <>
                {/* Toggle Mode démo pour les administrateurs */}
                {userRole === 'admin' && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      {isOpen && (
                        <Label htmlFor="demo-mode-sidebar" className="text-xs font-medium cursor-pointer">
                          Mode démo
                        </Label>
                      )}
                    </div>
                    <Switch
                      id="demo-mode-sidebar"
                      checked={fakeDataEnabled}
                      onCheckedChange={(checked) => {
                        console.log("🔄 Toggle mode démo:", checked);
                        console.log("📊 État actuel fakeDataEnabled:", fakeDataEnabled);
                        setFakeDataEnabled(checked);
                        console.log("✅ setFakeDataEnabled appelé avec:", checked);
                        
                        // Invalider toutes les queries immédiatement pour forcer le rechargement
                        queryClient.invalidateQueries();
                        console.log("🔄 Toutes les queries invalidées pour recharger les données");
                        
                        // Forcer un refetch de toutes les queries actives
                        queryClient.refetchQueries();
                      }}
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                  {isOpen && "Déconnexion"}
                </Button>
              </>
            ) : fakeDataEnabled ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-center gap-2 py-1.5 text-xs">
                  <ShieldCheck className="w-3 h-3" />
                  {isOpen && "Mode démo"}
                </Badge>
                <Button
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => navigate("/auth")}
                >
                  <LogIn className="w-4 h-4" />
                  {isOpen && "Se connecter"}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full gap-2"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="w-4 h-4" />
                {isOpen && "Se connecter"}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.aside>
    </>
  );
}
