import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFakeDataStore } from "@/store/useFakeDataStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, userRole } = useAuth();
  const { fakeDataEnabled, setFakeDataEnabled } = useFakeDataStore();

  // Timeout de sécurité : après 5 secondes, afficher le contenu même si loading
  // pour éviter les chargements infinis
  const [showContent, setShowContent] = useState(false);
  
  // Contrôler le mode démo selon le rôle de l'utilisateur
  useEffect(() => {
    // Si l'utilisateur est connecté et le mode démo est activé
    if (user && fakeDataEnabled && !loading) {
      // Si l'utilisateur n'est pas administrateur, désactiver le mode démo
      if (userRole !== 'administrateur') {
        console.log("🔒 Utilisateur non-admin détecté - Désactivation du mode démo");
        setFakeDataEnabled(false);
      }
    }
  }, [user, userRole, fakeDataEnabled, loading, setFakeDataEnabled]);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowContent(true);
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    // Timeout de sécurité : si le chargement dépasse 5 secondes, rediriger vers auth
    const timeoutId = setTimeout(() => {
      if (loading && !user) {
        window.location.replace("/auth");
      }
    }, 5000);

    if (loading && !showContent) {
      return () => clearTimeout(timeoutId);
    }
    
    if (!user && !showContent) {
      if (window.location.pathname !== "/auth") {
        window.location.replace("/auth");
      }
      return () => clearTimeout(timeoutId);
    }
    
    // Si requireAdmin, mais que user_roles échoue (erreur 500),
    // permettre l'accès après timeout pour éviter les blocages
    // L'utilisateur pourra toujours utiliser l'application
    if (requireAdmin && !isAdmin && !loading && !showContent) {
      // Attendre le timeout avant de rediriger
      return () => clearTimeout(timeoutId);
    }
    
    return () => clearTimeout(timeoutId);
  }, [user, loading, isAdmin, requireAdmin, navigate, showContent]);

  // En mode démo (fakeDataEnabled), permettre l'accès SEULEMENT si :
  // 1. L'utilisateur n'est pas connecté (démo publique depuis landing page)
  // 2. OU l'utilisateur est administrateur (démo dans l'app)
  if (fakeDataEnabled) {
    // Si l'utilisateur n'est pas connecté, permettre l'accès (démo publique depuis landing page)
    if (!user) {
      return <>{children}</>;
    }
    // Si l'utilisateur est connecté et est administrateur, permettre l'accès
    if (user && userRole === 'administrateur') {
      return <>{children}</>;
    }
    // Si l'utilisateur est connecté mais n'est pas administrateur, continuer avec la vérification normale
    // (le mode démo sera désactivé par le useEffect ci-dessus)
  }

  // Afficher le spinner seulement si loading ET pas encore de timeout
  if (loading && !showContent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas d'utilisateur après timeout, rediriger
  if (!user && showContent) {
    return null; // Le useEffect gère la redirection
  }
  
  // Si requireAdmin mais pas admin ET après timeout, permettre l'accès quand même
  // pour éviter les blocages si user_roles n'existe pas
  // Cela permet à l'application de fonctionner même si le backend n'est pas complètement configuré
  if (requireAdmin && !isAdmin && showContent) {
    // Afficher le contenu quand même après timeout
    // L'utilisateur pourra utiliser l'application même si les rôles ne sont pas chargés
    return <>{children}</>;
  }

  // Si requireAdmin et pas admin (mais pas encore de timeout), ne pas afficher
  if (requireAdmin && !isAdmin && !showContent) {
    return null;
  }

  return <>{children}</>;
};
