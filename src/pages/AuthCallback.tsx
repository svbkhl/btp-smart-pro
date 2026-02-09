import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";
import { isSystemAdmin } from "@/config/admin";
import { hasActiveSubscription } from "@/lib/checkSubscription";

// Déclaration de type pour la propriété globale window
declare global {
  interface Window {
    __IS_PASSWORD_RESET_PAGE__?: boolean;
  }
}

/**
 * Page de callback pour Supabase Auth
 * 
 * Gère les redirections après :
 * - Invitation par email
 * - Magic link
 * - OAuth (Google, Apple, etc.)
 * 
 * Flow :
 * 1. Lit les paramètres URL (code, token, error, etc.)
 * 2. Établit la session Supabase
 * 3. Redirige vers /dashboard ou /start
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  /**
   * Redirige l'utilisateur après authentification réussie.
   * Si pas de forfait actif → /start (choix forfait). Sinon → /dashboard.
   */
  const handlePostAuthNavigation = async (user: User) => {
    if (isSystemAdmin(user)) {
      navigate("/dashboard", { replace: true });
      return;
    }
    const hasSub = await hasActiveSubscription(user.id);
    if (!hasSub) {
      navigate("/start", { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Vérifier s'il y a une erreur dans l'URL
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (errorParam) {
          const errorMsg = errorDescription || errorParam || "Erreur lors de l'authentification";
          console.error("[AuthCallback] Error in URL:", { error: errorParam, description: errorDescription });
          setError(errorMsg);
          setStatus("error");
          setLoading(false);
          return;
        }

        // Vérifier les paramètres d'authentification
        const code = searchParams.get("code");
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const type = searchParams.get("type"); // invite, magiclink, recovery, etc.

        console.log("[AuthCallback] Processing callback:", {
          hasCode: !!code,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type: type || "unknown"
        });

        // Si on a un code, l'échanger contre une session
        if (code) {
          console.log("[AuthCallback] Exchanging code for session...");
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("[AuthCallback] Error exchanging code:", exchangeError);
            setError(exchangeError.message || "Erreur lors de l'échange du code");
            setStatus("error");
            setLoading(false);
            return;
          }

          if (data?.session?.user) {
            console.log("[AuthCallback] Session created successfully:", {
              userId: data.session.user.id,
              email: data.session.user.email
            });
            setStatus("success");
            // Petit délai pour afficher le succès
            setTimeout(() => {
              handlePostAuthNavigation(data.session.user);
            }, 500);
            return;
          }
        }

        // CRITIQUE : Vérifier si c'est un token de réinitialisation AVANT de créer la session
        // Vérifier à la fois dans les paramètres de requête et dans le hash
        const hashParamsCheck = new URLSearchParams(window.location.hash.substring(1));
        const typeFromHash = hashParamsCheck.get('type');
        const isRecoveryFromHash = typeFromHash === 'recovery';
        const isRecoveryFromQuery = type === 'recovery';
        const isRecoveryFromUrl = window.location.href.includes('type=recovery');
        
        if (isRecoveryFromQuery || isRecoveryFromHash || isRecoveryFromUrl) {
          console.log("[AuthCallback] Recovery token detected, redirecting to /reset-password", {
            isRecoveryFromQuery,
            isRecoveryFromHash,
            isRecoveryFromUrl,
            type,
            typeFromHash,
            href: window.location.href.substring(0, 150)
          });
          window.__IS_PASSWORD_RESET_PAGE__ = true;
          navigate('/reset-password', { replace: true });
          setLoading(false);
          return;
        }

        // Si on a des tokens directs (OAuth, etc.)
        if (accessToken && refreshToken) {
          console.log("[AuthCallback] Setting session with tokens...");
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error("[AuthCallback] Error setting session:", sessionError);
            setError(sessionError.message || "Erreur lors de la création de la session");
            setStatus("error");
            setLoading(false);
            return;
          }

          if (data?.session?.user) {
            // Vérifier à nouveau si c'est une session de réinitialisation
            const hashParams2 = new URLSearchParams(window.location.hash.substring(1));
            if (hashParams2.get('type') === 'recovery' || window.__IS_PASSWORD_RESET_PAGE__ === true) {
              console.log("[AuthCallback] Recovery session detected after setSession, redirecting");
              window.__IS_PASSWORD_RESET_PAGE__ = true;
              navigate('/reset-password', { replace: true });
              return;
            }
            
            console.log("[AuthCallback] Session set successfully");
            setStatus("success");
            setTimeout(() => {
              handlePostAuthNavigation(data.session.user);
            }, 500);
            return;
          }
        }

        // Si aucun paramètre spécifique, essayer de récupérer la session actuelle
        // (Supabase peut avoir déjà traité les paramètres automatiquement)
        console.log("[AuthCallback] No specific params, checking current session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[AuthCallback] Error getting session:", sessionError);
          setError(sessionError.message || "Erreur lors de la récupération de la session");
          setStatus("error");
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log("[AuthCallback] Session found, redirecting...");
          setStatus("success");
          setTimeout(() => {
            handlePostAuthNavigation(session.user);
          }, 500);
          return;
        }

        // Aucune session trouvée - attendre les événements auth
        console.log("[AuthCallback] No session found, listening for auth state changes...");
        
        let timeoutCleared = false;
        
        // Timeout de sécurité : si rien ne se passe après 10 secondes
        const timeoutId = setTimeout(() => {
          if (!timeoutCleared) {
            console.warn("[AuthCallback] Timeout waiting for auth state change");
            setError("Le traitement de l'authentification prend trop de temps. Veuillez réessayer.");
            setStatus("error");
            setLoading(false);
          }
        }, 10000);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("[AuthCallback] Auth state changed:", { event, hasSession: !!session });

          // CRITIQUE : Détecter les événements de réinitialisation de mot de passe
          if (event === "PASSWORD_RECOVERY") {
            console.log('[AuthCallback] PASSWORD_RECOVERY event detected, redirecting to /reset-password');
            timeoutCleared = true;
            clearTimeout(timeoutId);
            window.__IS_PASSWORD_RESET_PAGE__ = true;
            navigate('/reset-password', { replace: true });
            subscription.unsubscribe();
            return;
          }

          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            if (session?.user) {
              // Vérifications multiples pour détecter une session de réinitialisation
              const isResetPasswordPage = window.location.pathname === '/reset-password' || 
                                         window.location.pathname.startsWith('/reset-password');
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const urlParams = new URLSearchParams(window.location.search);
              const type = hashParams.get('type') || urlParams.get('type');
              const isRecoveryToken = type === 'recovery' || 
                                      window.__IS_PASSWORD_RESET_PAGE__ === true ||
                                      window.location.href.includes('type=recovery');
              
              // Vérifier si c'est une session de réinitialisation (Supabase marque ces sessions différemment)
              const isRecoverySession = session.user.app_metadata?.provider === 'email' && 
                                       (type === 'recovery' || window.location.href.includes('reset-password'));
              
              if (isResetPasswordPage || isRecoveryToken || isRecoverySession) {
                console.log('[AuthCallback] Ignoring SIGNED_IN event - recovery session detected:', {
                  isResetPasswordPage,
                  isRecoveryToken,
                  isRecoverySession,
                  type,
                  pathname: window.location.pathname,
                  href: window.location.href.substring(0, 100)
                });
                window.__IS_PASSWORD_RESET_PAGE__ = true;
                // Rediriger vers /reset-password si on n'y est pas déjà
                if (!isResetPasswordPage) {
                  navigate('/reset-password', { replace: true });
                }
                subscription.unsubscribe();
                return;
              }
              
              timeoutCleared = true;
              clearTimeout(timeoutId);
              setStatus("success");
              setTimeout(() => {
                handlePostAuthNavigation(session.user);
                subscription.unsubscribe();
              }, 500);
              return;
            }
          }

          if (event === "SIGNED_OUT") {
            // Attendre un peu plus pour voir si une session arrive
            setTimeout(() => {
              if (!session && !timeoutCleared) {
                setError("Aucune session trouvée. Veuillez réessayer.");
                setStatus("error");
                setLoading(false);
                timeoutCleared = true;
                clearTimeout(timeoutId);
                subscription.unsubscribe();
              }
            }, 2000);
          }
        });

        // Cleanup
        return () => {
          timeoutCleared = true;
          clearTimeout(timeoutId);
          subscription.unsubscribe();
        };

      } catch (err: any) {
        console.error("[AuthCallback] Exception processing callback:", err);
        setError(err?.message || "Une erreur inattendue s'est produite");
        setStatus("error");
        setLoading(false);
      }
    };

    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate]);

  // État de chargement
  if (loading && status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            </div>
            <CardTitle>Authentification en cours...</CardTitle>
            <CardDescription>
              Veuillez patienter pendant que nous finalisons votre connexion.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // État de succès
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Connexion réussie !</CardTitle>
            <CardDescription>
              Redirection en cours...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // État d'erreur
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Erreur d'authentification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              {error || "Une erreur s'est produite lors de l'authentification."}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/auth", { replace: true })}
              className="flex-1"
            >
              Retour à la connexion
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
