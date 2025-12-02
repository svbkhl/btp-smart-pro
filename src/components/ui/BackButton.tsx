import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Définir les sections principales et leurs pages racines
  const sections: Record<string, string> = {
    "/dashboard": "/dashboard",
    "/clients": "/clients",
    "/projects": "/projects",
    "/calendar": "/calendar",
    "/quotes": "/quotes",
    "/facturation": "/facturation",
    "/invoices": "/invoices",
    "/ai": "/ai",
    "/mailbox": "/mailbox",
    "/rh": "/employees-rh", // La page racine de RH est employees-rh
    "/employees-planning": "/employees-rh",
    "/employees-rh": "/employees-rh",
    "/my-planning": "/my-planning",
    "/settings": "/settings",
    "/admin": "/admin/users",
  };

  // Pages racines où on ne veut pas afficher le bouton retour
  const hideOnPages = [
    "/",
    "/auth",
    "/complete-profile",
    "/dashboard",
    "/clients",
    "/projects",
    "/calendar",
    "/quotes",
    "/facturation",
    "/invoices",
    "/ai",
    "/mailbox",
    "/employees-rh", // Page racine de la section RH
    "/my-planning",
    "/settings",
    "/admin/users",
  ];

  // Ne pas afficher le bouton sur les pages racines
  if (hideOnPages.includes(location.pathname)) {
    return null;
  }

  // Trouver la section actuelle
  const getCurrentSection = () => {
    const path = location.pathname;
    for (const [prefix, rootPage] of Object.entries(sections)) {
      if (path.startsWith(prefix)) {
        return { prefix, rootPage };
      }
    }
    return null;
  };

  const handleBack = () => {
    const currentSection = getCurrentSection();
    
    if (!currentSection) {
      // Si pas de section détectée, comportement par défaut
      navigate(-1);
      return;
    }

    // Si on est sur une page qui a sa propre entrée dans sections et qui n'est pas la page racine
    // (comme /employees-planning ou /rh/employees), retourner à la page racine
    if (currentSection.prefix !== currentSection.rootPage && location.pathname === currentSection.prefix) {
      navigate(currentSection.rootPage);
      return;
    }

    // Calculer la profondeur dans la section
    const currentPath = location.pathname;
    const pathParts = currentPath.replace(currentSection.prefix, "").split("/").filter(p => p);
    
    if (pathParts.length >= 1) {
      // On est dans une sous-page, retourner à la page racine de la section
      navigate(currentSection.rootPage);
    } else {
      // pathParts.length === 0 signifie qu'on est sur la page du préfixe elle-même
      // Retourner à la page racine
      navigate(currentSection.rootPage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-20 left-4 z-50 md:left-6 lg:left-8"
    >
      <Button
        onClick={handleBack}
        variant="outline"
        size="icon"
        className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-background/95 backdrop-blur-xl border-border/50 hover:bg-accent/80"
        title="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
    </motion.div>
  );
};

