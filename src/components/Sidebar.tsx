import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  FolderKanban, 
  Calendar,
  CalendarDays,
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
import { useCompany, useCompanies } from "@/hooks/useCompany";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useUserSettings } from "@/hooks/useUserSettings";
import { isFeatureEnabled } from "@/utils/companyFeatures";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarSkeleton } from "@/components/SidebarSkeleton";
// Types pour les items de menu
type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  subItems?: Array<{ label: string; path: string }>;
  feature?: string | null; // Feature requise pour afficher cet item
  employeeAccess?: boolean; // Si true, accessible aux employés simples (par défaut)
  requiredPermission?: string | null; // Permission requise pour afficher cet item
};

type MenuGroup = {
  items: MenuItem[];
};

// Structure de base des menu items par groupes avec mapping des features
const baseMenuGroups: Array<{ items: Array<MenuItem & { feature?: string | null; employeeAccess?: boolean; requiredPermission?: string | null }> }> = [
  {
    items: [
      // 1️⃣ Tableau de bord (nécessite la permission dashboard.access)
      { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard", feature: null, employeeAccess: true, requiredPermission: "dashboard.access" },
    ],
  },
  {
    items: [
      // 3️⃣ Clients (nécessite la permission clients.access)
      { icon: Users, label: "Clients", path: "/clients", feature: null, employeeAccess: true, requiredPermission: "clients.access" },
    ],
  },
  {
    items: [
      // 4️⃣ Chantiers (nécessite la permission projects.access)
      { icon: FolderKanban, label: "Chantiers", path: "/projects", feature: "projets", employeeAccess: true, requiredPermission: "projects.access" },
    ],
  },
  {
    items: [
          // 5️⃣ Calendrier & Agenda (tout en un)
          {
            icon: Calendar,
            label: "Calendrier & Agenda",
            path: "/calendar",
            feature: "planning",
            employeeAccess: true,
            requiredPermission: "planning.access"
          },
    ],
  },
  {
    items: [
      // 6️⃣ Employés (nécessite la permission employees.access)
      { icon: UserCircle, label: "Employés", path: "/employees-rh", feature: "employes", employeeAccess: true, requiredPermission: "employees.access" },
    ],
  },
  {
    items: [
      // 7️⃣ IA (nécessite la permission ai.access)
      { icon: Brain, label: "IA", path: "/ai", feature: "ia_assistant", employeeAccess: true, requiredPermission: "ai.access" },
    ],
  },
  {
    items: [
      // 8️⃣ Facturation (nécessite la permission billing.access)
      { icon: FileText, label: "Facturation", path: "/facturation", feature: "facturation", employeeAccess: true, requiredPermission: "billing.access" },
    ],
  },
  {
    items: [
      // 9️⃣ Messagerie (nécessite la permission messaging.access)
      { icon: Mail, label: "Messagerie", path: "/messaging", feature: null, employeeAccess: true, requiredPermission: "messaging.access" },
    ],
  },
];

// Menu fixe pour les EMPLOYÉS : leurs outils de travail (inclut IA)
// Pas d'Employés, pas d'Analytics, pas de stats (CA, nb chantiers)
const employeeMenuGroups: MenuGroup[] = [
  { items: [{ icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard" }] },
  { items: [{ icon: FolderKanban, label: "Mes chantiers", path: "/projects" }] },
  { items: [{ icon: Calendar, label: "Calendrier", path: "/calendar" }] },
  { items: [{ icon: Mail, label: "Messagerie", path: "/messaging" }] },
  { items: [{ icon: FileText, label: "Facturation", path: "/facturation" }] },
  { items: [{ icon: Brain, label: "IA", path: "/ai" }] },
  { items: [{ icon: Users, label: "Clients", path: "/clients" }] },
];

// Fonction pour filtrer les menu items selon les features et les permissions
const getMenuGroups = (
  company: ReturnType<typeof useCompany>["data"],
  isEmployee: boolean,
  can: (permission: string) => boolean = () => false,
  isOwner: boolean = false
): MenuGroup[] => {
  // FALLBACK: Si aucune permission n'est disponible, afficher les items de base
  // Cela évite une sidebar vide pendant le chargement ou en cas de problème
  const shouldShowAll = isOwner || !company;
  
  if (shouldShowAll) {
    // Owner ou pas de company → afficher tous les items (vérifier features uniquement)
    return baseMenuGroups
      .map((group) => ({
        items: group.items
          .filter((item) => {
            if (!company) return true; // Mode démo/pas de company = tout afficher
            if (!item.feature) return true; // Pas de feature = toujours visible
            return isFeatureEnabled(company, item.feature as keyof NonNullable<typeof company>["features"]);
          })
          .map(({ feature, employeeAccess, requiredPermission, ...rest }) => ({
            ...rest,
            // Préserver explicitement les subItems
            ...(rest.subItems && { subItems: rest.subItems })
          })),
      }))
      .filter((group) => group.items.length > 0);
  }
  
  // Pour les employés : vérifier permissions ET features
  const filteredGroups = baseMenuGroups
    .map((group) => ({
      items: group.items
        .filter((item) => {
          // Vérifier la permission d'abord
          if (item.requiredPermission && !can(item.requiredPermission)) {
            return false;
          }
          
          // Puis vérifier la feature
          if (item.feature) {
            return isFeatureEnabled(company, item.feature as keyof NonNullable<typeof company>["features"]);
          }
          
          return true;
        })
        .map(({ feature, employeeAccess, requiredPermission, ...rest }) => ({
          ...rest,
          // Préserver explicitement les subItems
          ...(rest.subItems && { subItems: rest.subItems })
        })),
    }))
    .filter((group) => group.items.length > 0);
  
  // FALLBACK CRITIQUE: Si aucun item n'est affiché, forcer l'affichage des items de base
  // pour éviter une sidebar complètement vide (meilleure UX)
  if (filteredGroups.length === 0 || filteredGroups.every(g => g.items.length === 0)) {
    return baseMenuGroups
      .slice(0, 3) // Afficher au minimum: Dashboard, Clients, Chantiers
      .map((group) => ({
        items: group.items.map(({ feature, employeeAccess, requiredPermission, ...rest }) => ({
          ...rest,
          ...(rest.subItems && { subItems: rest.subItems })
        })),
      }))
      .filter((group) => group.items.length > 0);
  }
  
  return filteredGroups;
};

// Groupe de menu pour les paramètres (toujours visible)
// Note: Les items admin seront ajoutés dynamiquement selon les permissions

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, userRole, loading: authLoading } = useAuth();
  const { isOwner, can, isEmployee, loading: permissionsLoading } = usePermissions();
  const queryClient = useQueryClient();
  const fakeDataEnabled = useFakeDataStore((state) => state.fakeDataEnabled);
  const setFakeDataEnabled = useFakeDataStore((state) => state.setFakeDataEnabled);
  
  // Ref pour ignorer les hover events pendant la navigation
  const isNavigatingRef = useRef(false);
  
  const isMobile = useIsMobile();
  const { isPinned, isVisible, hasBeenStable, setIsPinned, setIsVisible, setIsHovered: setGlobalIsHovered, setHasBeenStable } = useSidebar();
  
  // Ref pour tracker la stabilité des menuGroups (éviter affichage progressif)
  const menuGroupsStableRef = useRef(false);
  // Si la sidebar a déjà été stable (ex. après un changement de page), l'afficher tout de suite pour ne rien faire disparaître
  const [isMenuStable, setIsMenuStable] = useState(hasBeenStable);
  const hasInitializedRef = useRef(false);

  // Fonction pour gérer la navigation : rediriger vers formulaire d'essai si pas connecté en mode démo
  const handleNavigation = (path: string, e?: React.MouseEvent) => {
    // Fermer la sidebar immédiatement sur mobile ET si elle n'est pas pinned sur desktop
    if (isMobile || !isPinned) {
      setIsVisible(false);
    }
    
    // Si l'utilisateur n'est pas connecté et qu'on est en mode démo, rediriger vers le formulaire
    if (!user && fakeDataEnabled) {
      e?.preventDefault();
      navigate("/?openTrialForm=true");
      return;
    }
    // Sinon, navigation normale
    navigate(path);
  };
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { data: company } = useCompany();
  const { data: companies } = useCompanies();
  const { companyId } = useCompanyId();
  const { data: settings } = useUserSettings();
  
  // Fonction pour vérifier si un chemin est actif
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };
  
  // Calculer menuGroups avec useMemo pour éviter les recalculs inutiles
  // Fournir une fonction can stable avec useCallback pour éviter les re-renders
  const canFunc = useCallback(
    (permission: string) => {
      if (typeof can === 'function') {
        return can(permission);
      }
      return false;
    },
    [can]
  );
  
  // Calcul des menuGroups : employés = menu fixe (inclut forceEmployeeView via usePermissions)
  const menuGroups = useMemo(
    () => (isEmployee ? employeeMenuGroups : getMenuGroups(company, isEmployee, canFunc, isOwner)),
    [company, isEmployee, canFunc, isOwner]
  );
  
  // Utiliser isVisible du contexte pour mobile aussi
  const isOpen = isMobile ? isVisible : (isPinned || isVisible || isHovered);
  
  // Entreprise courante (celle sélectionnée ou la première) pour nom/logo
  const currentCompany = companyId && companies?.length
    ? companies.find((c) => c.id === companyId) ?? companies[0]
    : company ?? null;
  // Nom choisi par l'admin à la création = companies.name ; cohérent avec Paramètres > Nom de l'entreprise
  const companyName =
    currentCompany?.name?.trim() ||
    settings?.company_name?.trim() ||
    "BTP Smart Pro";
  const companyLogoUrl =
    settings?.company_logo_url?.trim() || currentCompany?.settings?.logo_url?.trim() || undefined;

  // Menu paramètres (uniquement le lien vers Settings)
  const settingsMenuGroup: MenuGroup = {
    items: [
      { icon: Settings, label: "Paramètres", path: "/settings" },
    ],
  };

  // Initialiser expandedGroups - utiliser useMemo pour éviter les problèmes d'initialisation
  const initialExpandedGroups = useMemo(() => {
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
  }, [menuGroups, location.pathname]);
  
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(initialExpandedGroups);
  
  // Mettre à jour expandedGroups quand menuGroups ou location change (seulement si différent)
  useEffect(() => {
    // Comparer les objets pour éviter les mises à jour inutiles
    const currentStr = JSON.stringify(expandedGroups);
    const newStr = JSON.stringify(initialExpandedGroups);
    
    if (currentStr !== newStr) {
      setExpandedGroups(initialExpandedGroups);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, menuGroups.length]);

  // Fermer la sidebar quand on change de route (sauf si épinglée) — ne rien faire si épinglée pour garder la fluidité
  useEffect(() => {
    isNavigatingRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (isMobile) {
      setIsVisible(false);
    } else if (!isPinned) {
      setIsHovered(false);
      setIsVisible(false);
      setGlobalIsHovered(false);
    }
    const navigationTimeout = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 300);
    return () => clearTimeout(navigationTimeout);
  }, [location.pathname, isMobile, isPinned, setIsVisible, setGlobalIsHovered]);

  // ✅ useEffect supprimé - l'initialisation se fait dans SidebarContext
  // Cet useEffect causait un conflit avec celui qui ferme la sidebar au changement de route

  const toggleGroup = (groupIndex: number) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupIndex]: !prev[groupIndex]
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Si on est en mode démo, rediriger vers l'accueil
    if (fakeDataEnabled) {
      navigate("/");
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

  // Attendre que menuGroups soit STABLE avant d'afficher (éviter affichage progressif)
  // Une fois stable, persister dans le contexte pour que la sidebar ne disparaisse plus au changement de page
  useEffect(() => {
    const totalItems = menuGroups.reduce((sum, g) => sum + g.items.length, 0);
    
    // Considérer comme stable si :
    // 1. Auth et permissions sont chargés
    // 2. On a une company OU on est owner
    // 3. On a au moins 1 item dans le menu
    const isStable = 
      !authLoading && 
      !permissionsLoading && 
      (company !== undefined || isOwner) &&
      totalItems > 0;
    
    if (isStable && !menuGroupsStableRef.current) {
      menuGroupsStableRef.current = true;
      setIsMenuStable(true);
      setHasBeenStable(true); // Ne plus jamais faire disparaître la sidebar au remontage (navigation)
    }
  }, [authLoading, permissionsLoading, company, isOwner, menuGroups, setHasBeenStable]);
  
  // Afficher la sidebar dès qu'elle a déjà été stable (ex. après clic sur un autre lien) pour garder une navigation fluide
  if (!isMenuStable) {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Button - Déplacé dans TopBar pour meilleure intégration */}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsVisible(false)}
          />
        )}
      </AnimatePresence>

      {/* Hover Zone (Desktop) - Zone fine à gauche pour révéler la sidebar */}
      {!isMobile && !isPinned && (
        <motion.div
          className="fixed left-0 top-0 bottom-0 w-2 z-30 group cursor-pointer"
          onMouseEnter={() => {
            // Ouverture immédiate quand on se colle à gauche
            // Ignorer pendant la navigation
            if (!isPinned && !isNavigatingRef.current) {
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
        initial={false}
        animate={{
          x: isOpen ? 0 : -320,
          opacity: isOpen ? 1 : 0
        }}
        onMouseEnter={() => {
          // Ignorer les hover events pendant la navigation
          if (!isMobile && !isPinned && !isNavigatingRef.current) {
            setIsHovered(true);
            setIsVisible(true);
            setGlobalIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile && !isPinned && !isNavigatingRef.current) {
            setIsHovered(false);
            setIsVisible(false);
            setGlobalIsHovered(false);
          }
        }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 40,
          mass: 0.8
        }}
        className={cn(
          "flex flex-col z-40",
          isMobile
            ? "bg-background"
            : "bg-transparent backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "shadow-2xl shadow-black/10 dark:shadow-black/30",
          "transition-shadow duration-300 ease-out",
          "hover:shadow-[0_25px_70px_-20px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_25px_70px_-20px_rgba(139,92,246,0.4)]",
          "rounded-2xl",
          isMobile 
            ? "fixed w-80 h-screen left-0 top-0" 
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
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="p-6 border-b border-white/20 dark:border-white/10"
        >
          {(user || !fakeDataEnabled) ? (
            <Link 
              to="/dashboard" 
              className="flex items-center gap-3 group"
              onClick={() => handleNavigation("/dashboard")}
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0",
                  !companyLogoUrl && "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20"
                )}
              >
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt={companyName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-primary-foreground font-bold text-xl">B</span>
                )}
              </motion.div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground truncate" title={companyName}>
                  {companyName}
                </h2>
              </div>
            </Link>
          ) : (
            <button 
              onClick={(e) => handleNavigation("/dashboard", e)}
              className="flex items-center gap-3 group w-full text-left"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0",
                  !companyLogoUrl && "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20"
                )}
              >
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt={companyName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-primary-foreground font-bold text-xl">B</span>
                )}
              </motion.div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground truncate" title={companyName}>
                  {companyName}
                </h2>
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
              "bg-white/5 dark:bg-white/5 backdrop-blur-xl",
              "border border-white/20 dark:border-white/10",
              "flex items-center justify-center",
              "hover:bg-white/50 dark:hover:bg-white/20",
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
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          duration: 0.15
                        }}
                        whileHover={{ 
                          scale: 1.02, 
                          x: 4,
                          transition: { type: "spring", stiffness: 400, damping: 20 }
                        }}
                        whileTap={{ scale: 0.98 }}
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
                                          onClick={() => handleNavigation(subItem.path)}
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
                            data-onboarding={item.path ? `menu-${item.path.replace("/", "")}` : undefined}
                            onClick={() => handleNavigation(item.path)}
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
                            data-onboarding={item.path ? `menu-${item.path.replace("/", "")}` : undefined}
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
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  duration: 0.15
                }}
                whileHover={{ 
                  scale: 1.02, 
                  x: 4,
                  transition: { type: "spring", stiffness: 400, damping: 20 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                {(user || !fakeDataEnabled) ? (
                  <Link
                    to={item.path}
                    data-onboarding={item.path ? `menu-${item.path.replace("/", "")}` : undefined}
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
          transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.15 }}
          className="p-4 border-t border-white/20 dark:border-white/10 space-y-3"
        >

          {/* User Actions */}
          <div className="pt-2 space-y-1">
            {user ? (
              <>
                {/* Toggle Mode démo uniquement pour les admins (pas owner/employee) */}
                {userRole === 'admin' && !isOwner && !isEmployee && (
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
                        setFakeDataEnabled(checked);
                        queryClient.invalidateQueries();
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
                  onClick={() => navigate("/?openTrialForm=true")}
                >
                  <LogIn className="w-4 h-4" />
                  {isOpen && "Demander un essai"}
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
