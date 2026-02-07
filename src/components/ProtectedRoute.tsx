import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useSubscription } from "@/hooks/useSubscription";
import { isSystemAdmin } from "@/config/admin";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const PAYWALL_PATHS = ["/start", "/start/success", "/start/cancel"];

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isAdmin, userRole, currentCompanyId } = useAuth();
  const { fakeDataEnabled, setFakeDataEnabled } = useFakeDataStore();
  const { isActive: subscriptionActive, isLoading: subscriptionLoading } = useSubscription();
  const isPaywallPath = PAYWALL_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  // Timeout de sécurité : après 5 secondes, afficher le contenu même si loading
  // pour éviter les chargements infinis
  const [showContent, setShowContent] = useState(false);
  
  // Contrôler le mode démo selon le rôle de l'utilisateur
  useEffect(() => {
    // Si l'utilisateur est connecté et le mode démo est activé
    if (user && fakeDataEnabled && !loading) {
      // Si l'utilisateur n'est pas administrateur, désactiver le mode démo
      if (userRole !== 'admin') {
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
    // CRITIQUE : Ne pas rediriger si on est en mode réinitialisation de mot de passe
    const isResetPasswordPage = window.location.pathname === '/reset-password' || 
                                window.location.pathname.startsWith('/reset-password');
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlParams = new URLSearchParams(window.location.search);
    const isRecoveryToken = hashParams.get('type') === 'recovery' || 
                            urlParams.get('type') === 'recovery' ||
                            window.__IS_PASSWORD_RESET_PAGE__ === true ||
                            window.location.href.includes('type=recovery');
    
    if (isResetPasswordPage || isRecoveryToken) {
      // Laisser la page /reset-password gérer elle-même la redirection
      return;
    }

    // Timeout de sécurité : si le chargement dépasse 5 secondes, rediriger vers auth ou page d'accueil
    // MAIS jamais si on est sur /reset-password (déjà vérifié ci-dessus avec return early)
    const timeoutId = setTimeout(() => {
      if (loading && !user) {
        // Double vérification : ne jamais rediriger depuis /reset-password
        const isResetPasswordPage = window.location.pathname === '/reset-password' || 
                                    window.location.pathname.startsWith('/reset-password');
        const hashParamsCheck = new URLSearchParams(window.location.hash.substring(1));
        const isRecoveryTokenCheck = hashParamsCheck.get('type') === 'recovery' || 
                                     window.__IS_PASSWORD_RESET_PAGE__ === true;
        
        if (isResetPasswordPage || isRecoveryTokenCheck) {
          return; // Ne pas rediriger si on est en mode reset password
        }
        
        // Si on est en mode démo, rediriger vers la page d'accueil avec le formulaire
        if (fakeDataEnabled) {
          navigate("/?openTrialForm=true", { replace: true });
        } else {
          window.location.replace("/auth");
        }
      }
    }, 5000);

    if (loading && !showContent) {
      return () => clearTimeout(timeoutId);
    }
    
    if (!user && !showContent) {
      // Si on est en mode démo (fakeDataEnabled), rediriger vers la page d'accueil avec le formulaire d'essai
      if (fakeDataEnabled) {
        console.log("🎮 [ProtectedRoute] Mode démo actif - Redirection vers page d'accueil avec formulaire d'essai");
        navigate("/?openTrialForm=true", { replace: true });
        return () => clearTimeout(timeoutId);
      }
      // Sinon, rediriger vers /auth normalement (uniquement si on n'est pas déjà sur /auth)
      if (window.location.pathname !== "/auth" && !fakeDataEnabled) {
        console.log("🔒 [ProtectedRoute] Redirection vers /auth (mode normal)");
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
  }, [user, loading, isAdmin, requireAdmin, navigate, showContent, fakeDataEnabled]);

  // Redirection Settings en mode démo (dans un effet pour éviter setState pendant le render)
  useEffect(() => {
    if (fakeDataEnabled && user && userRole !== 'admin') {
      const isSettingsPage = location.pathname === '/settings' || location.pathname.startsWith('/settings');
      if (isSettingsPage) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [fakeDataEnabled, user, userRole, location.pathname, navigate]);

  // Après timeout, si toujours pas d'utilisateur : redirection (en effet pour éviter setState pendant render)
  useEffect(() => {
    if (!user && showContent) {
      if (fakeDataEnabled) {
        navigate("/?openTrialForm=true", { replace: true });
      } else if (window.location.pathname !== "/auth") {
        window.location.replace("/auth");
      }
    }
  }, [user, showContent, fakeDataEnabled, navigate]);

  // Gate abonnement B2B : rediriger vers /start dans un effet (pas pendant le render)
  // Ne jamais rediriger les admins système (même sans company) pour éviter /start au refresh
  useEffect(() => {
    const adminSystem = isSystemAdmin(user);
    const skipGate = isPaywallPath || !user || isAdmin || adminSystem;
    if (skipGate) return;
    if (currentCompanyId && !subscriptionLoading && !subscriptionActive) {
      navigate("/start", { replace: true });
      return;
    }
    if (!currentCompanyId && !subscriptionLoading) {
      navigate("/start", { replace: true });
    }
  }, [isPaywallPath, user, isAdmin, currentCompanyId, subscriptionLoading, subscriptionActive, navigate]);

  // En mode démo (fakeDataEnabled), permettre l'accès SEULEMENT si :
  // 1. L'utilisateur n'est pas connecté (démo publique depuis landing page)
  // 2. OU l'utilisateur est administrateur (démo dans l'app)
  // EXCEPTION : Bloquer l'accès à Settings en mode démo (redirection gérée dans l'effet ci-dessus)
  if (fakeDataEnabled) {
    const isSettingsPage = location.pathname === '/settings' || location.pathname.startsWith('/settings');
    if (isSettingsPage && user && userRole !== 'admin') {
      return null; // l'effet redirige vers dashboard
    }
    
    // Si l'utilisateur n'est pas connecté, permettre l'accès (démo publique depuis landing page)
    if (!user) {
      return <>{children}</>;
    }
    // Si l'utilisateur est connecté et est administrateur, permettre l'accès
    if (user && userRole === 'admin') {
      return <>{children}</>;
    }
    // Si l'utilisateur est connecté mais n'est pas administrateur, continuer avec la vérification normale
    // (le mode démo sera désactivé par le useEffect ci-dessus)
  }

  // Si on doit rediriger vers /start (gate abo), ne pas afficher les children pendant la redirection
  // Exclure aussi les admins système (ex. sabri.khalfallah6@gmail.com) qui n'ont pas de company
  const adminSystem = isSystemAdmin(user);
  const shouldRedirectToStart =
    !isPaywallPath && user && !isAdmin && !adminSystem && !subscriptionLoading &&
    ((currentCompanyId && !subscriptionActive) || !currentCompanyId);
  if (shouldRedirectToStart) {
    return null; // l'effet ci-dessus fait la redirection
  }

  // Afficher le spinner seulement si loading ET pas encore de timeout (ou attente abonnement)
  const waitingSubscription = !isPaywallPath && user && currentCompanyId && subscriptionLoading;
  if ((loading && !showContent) || waitingSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas d'utilisateur après timeout, redirection gérée dans le useEffect principal (ligne ~89)
  if (!user && showContent) {
    return null;
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
