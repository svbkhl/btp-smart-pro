import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { isSystemAdmin, isCloserEmail } from "@/config/admin";
import { hasActiveSubscription } from "@/lib/checkSubscription";

// Déclaration de type pour la propriété globale window
declare global {
  interface Window {
    __IS_PASSWORD_RESET_PAGE__?: boolean;
  }
}

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { refetchCurrentCompanyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ─── Navigation post-auth (définie ici pour être réutilisée) ─────────────
  // Ordre : admin → closer → invitation → abo → dashboard (les closers ne doivent jamais tomber sur /start)
  const handlePostAuthNavigation = useCallback(async (sessionUser: User) => {
    if (isSystemAdmin(sessionUser)) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Vérifier closer (config statique + base de données) avant invitation_id
    const emailLower = sessionUser.email?.toLowerCase() || "";
    let userIsCloser = isCloserEmail(emailLower);
    if (!userIsCloser && emailLower) {
      const { data } = await supabase
        .from("closer_emails")
        .select("email")
        .eq("email", emailLower)
        .maybeSingle();
      userIsCloser = !!data;
    }
    if (userIsCloser) {
      navigate("/closer", { replace: true });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const invitationId = params.get("invitation_id");
    if (invitationId) {
      navigate(`/start?invitation_id=${encodeURIComponent(invitationId)}`, { replace: true });
      return;
    }

    const hasSub = await hasActiveSubscription(sessionUser.id, sessionUser.email);
    if (!hasSub) {
      navigate("/start", { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  // ─── Auto-redirect si l'utilisateur a déjà une session valide ────────────
  // Quand un invité revient plus tard, sa session peut encore être valide.
  // On le redirige directement sans lui demander de re-saisir ses identifiants.
  useEffect(() => {
    const isResetPage = window.location.pathname.startsWith('/reset-password') ||
                        window.__IS_PASSWORD_RESET_PAGE__ === true;
    if (isResetPage) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      await handlePostAuthNavigation(session.user);
    }).catch(() => { /* session invalide → laisser le formulaire */ });
  }, [handlePostAuthNavigation]);

  useEffect(() => {
    // Déclarer searchParams une seule fois pour tout le useEffect
    const searchParams = new URLSearchParams(window.location.search);
    
    // Afficher le message de succès si on vient de réinitialiser le mot de passe
    // Vérifier à la fois l'état de navigation (legacy) et les paramètres URL
    const resetSuccess = searchParams.get('reset') === 'success';
    
    if (resetSuccess) {
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été réinitialisé avec succès. Veuillez vous connecter.",
      });
      // Nettoyer l'URL pour éviter de réafficher le message
      window.history.replaceState({}, '', '/auth');
    }
    
    // Legacy: Vérifier aussi l'état de navigation (pour compatibilité)
    const locationState = (window.history.state && window.history.state.usr) || {};
    if (locationState.message && locationState.type === 'success') {
      toast({
        title: "Mot de passe mis à jour",
        description: locationState.message,
      });
      // Nettoyer l'état pour éviter de réafficher le message
      window.history.replaceState({ ...window.history.state, usr: {} }, '');
    }

    // Rediriger les anciennes routes d'inscription vers la connexion
    if (searchParams.has('signup') || window.location.pathname.includes('signup')) {
      navigate('/auth', { replace: true });
      return;
    }

    // Message après acceptation d'invitation : redirection vers connexion
    const urlMessage = searchParams.get('message');
    const wasInviteAccepted = urlMessage === 'invite-accepted' || urlMessage === 'already-member';
    if (urlMessage === 'invite-accepted') {
      toast({
        title: "Invitation acceptée avec succès",
        description: "Connectez-vous pour accéder à votre espace entreprise.",
      });
      window.history.replaceState({}, '', '/auth');
    } else if (urlMessage === 'already-member') {
      toast({
        title: "Invitation acceptée avec succès",
        description: "Vous êtes déjà membre. Connectez-vous pour accéder à votre espace.",
      });
      window.history.replaceState({}, '', '/auth');
    }

    // Pré-remplir l'email depuis l'URL (pour les comptes créés via invitation)
    // Note: Le paramètre reset=success est déjà géré ci-dessus
    if (searchParams.has('email')) {
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
        // Afficher un message si c'est pour un compte créé
        if (urlMessage === 'account-created') {
          toast({
            title: "Compte créé avec succès !",
            description: `Votre compte a été créé avec l'email ${emailParam}. Veuillez vous connecter avec votre mot de passe.`,
          });
        }
      }
    }

    // Gérer explicitement les callbacks Supabase Auth (invitation, magic link, etc.)
    const handleAuthCallback = async () => {
      // Vérifier si on est sur la route /auth/callback avec des paramètres
      const isCallbackRoute = window.location.pathname === '/auth/callback';
      const hasAuthParams = searchParams.has('code') || searchParams.has('token') || searchParams.has('access_token') || searchParams.has('error');
      
      if (isCallbackRoute && hasAuthParams) {
        setLoading(true);
        console.log('[Auth] Processing callback with params:', {
          code: searchParams.has('code'),
          token: searchParams.has('token'),
          access_token: searchParams.has('access_token'),
          error: searchParams.get('error'),
          error_description: searchParams.get('error_description')
        });

        // Vérifier s'il y a une erreur dans l'URL
        if (searchParams.has('error')) {
          const errorMsg = searchParams.get('error_description') || searchParams.get('error') || 'Erreur lors de la connexion';
          setError(errorMsg);
          toast({
            title: "Erreur de connexion",
            description: errorMsg,
            variant: "destructive",
          });
          setLoading(false);
          // Nettoyer l'URL
          navigate('/auth', { replace: true });
          return;
        }

        // Essayer de récupérer la session (Supabase devrait automatiquement traiter les paramètres)
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[Auth] Error getting session:', sessionError);
            setError(sessionError.message || 'Erreur lors de la récupération de la session');
            setLoading(false);
            navigate('/auth', { replace: true });
            return;
          }

          if (session?.user) {
            console.log('[Auth] Session created successfully, redirecting...');
            await handlePostAuthNavigation(session.user);
            // Nettoyer l'URL après redirection
            navigate(window.location.pathname, { replace: true });
          } else {
            // Pas de session immédiate, attendre onAuthStateChange
            console.log('[Auth] No immediate session, waiting for auth state change...');
            setLoading(true);
          }
        } catch (callbackError: any) {
          console.error('[Auth] Exception handling callback:', callbackError);
          setError(callbackError?.message || 'Erreur lors du traitement du callback');
          setLoading(false);
          navigate('/auth', { replace: true });
        }
      }
    };

    // Exécuter le handler de callback si nécessaire
    handleAuthCallback();

    // Ne PAS auto-rediriger les utilisateurs déjà connectés : ils doivent voir /auth
    // et choisir de continuer. Redirection uniquement après login explicite (callback, onAuthStateChange).
    // Supabase getSession() supprimé ici pour éviter le bounce direct vers /start.

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', { event, hasSession: !!session, hasUser: !!session?.user });
      
      // CRITIQUE : Gérer l'événement PASSWORD_RECOVERY en premier
      if (event === "PASSWORD_RECOVERY") {
        console.log('[Auth] PASSWORD_RECOVERY event detected - preventing auto-login');
        // Définir le flag immédiatement pour bloquer toutes les redirections
        window.__IS_PASSWORD_RESET_PAGE__ = true;
        // Rediriger vers la page de réinitialisation professionnelle
        // Ne pas rediriger si on est déjà sur la page de réinitialisation
        if (window.location.pathname !== '/reset-password' && !window.location.pathname.startsWith('/reset-password')) {
          console.log('[Auth] Redirecting to /reset-password');
          navigate('/reset-password', { replace: true });
        } else {
          console.log('[Auth] Already on /reset-password page');
        }
        setLoading(false);
        subscription.unsubscribe();
        // IMPORTANT: Ne PAS continuer le traitement pour éviter toute redirection vers dashboard
        return;
      }

      // Rediriger uniquement après login explicite (SIGNED_IN), pas au chargement (TOKEN_REFRESHED)
      // pour que l'utilisateur voie toujours /auth en premier
      if (event === "SIGNED_IN") {
        if (session?.user) {
          // Vérifications multiples pour détecter une session de réinitialisation
          const isResetPasswordPage = window.location.pathname === '/reset-password' || 
                                     window.location.pathname.startsWith('/reset-password');
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const callbackSearchParams = new URLSearchParams(window.location.search);
          const type = hashParams.get('type') || callbackSearchParams.get('type');
          const isRecoveryToken = type === 'recovery' || 
                                  window.__IS_PASSWORD_RESET_PAGE__ === true ||
                                  window.location.href.includes('type=recovery');
          
          if (isResetPasswordPage || isRecoveryToken) {
            console.log('[Auth] Ignoring SIGNED_IN event - recovery session detected:', {
              isResetPasswordPage,
              isRecoveryToken,
              type,
              pathname: window.location.pathname,
              flag: window.__IS_PASSWORD_RESET_PAGE__
            });
            window.__IS_PASSWORD_RESET_PAGE__ = true;
            // Rediriger vers /reset-password si on n'y est pas déjà
            if (!isResetPasswordPage) {
              navigate('/reset-password', { replace: true });
            }
            subscription.unsubscribe();
            return;
          }
          
          await handlePostAuthNavigation(session.user);
          // Nettoyer l'URL si on est sur /auth/callback
          if (window.location.pathname === '/auth/callback') {
            navigate(window.location.pathname, { replace: true });
          }
        }
      }

      if (session?.user) {
        // Ne pas rediriger si on est sur la page de réinitialisation de mot de passe
        const isResetPasswordPage = window.location.pathname === '/reset-password';
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isRecoveryToken = hashParams.get('type') === 'recovery' || 
                                window.__IS_PASSWORD_RESET_PAGE__ === true;
        
        if (isResetPasswordPage || isRecoveryToken) {
          console.log('[Auth] Ignoring session user on reset password page');
          return;
        }
        
        // Ne pas rediriger ici : TOKEN_REFRESHED/INITIAL_SESSION peuvent faire rebondir vers /start
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast, refetchCurrentCompanyId]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Normaliser l'email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Logger les informations de la requête (sans le mot de passe en clair)
    console.log('🔐 [handleSignIn] Starting login attempt:', {
      email: normalizedEmail,
      passwordLength: cleanPassword.length,
      hasPassword: cleanPassword.length > 0,
      timestamp: new Date().toISOString(),
    });

    // Vérifier les variables d'environnement
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    console.log('🔧 [handleSignIn] Configuration check:', {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
      hasAnonKey: !!supabaseAnonKey,
      anonKeyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
    });

    try {
      // Intercepter la requête pour logger les détails
      const startTime = Date.now();
      
      // Faire la requête avec timeout de sécurité (20s max)
      const signInPromise = supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: cleanPassword,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("La connexion a pris trop de temps. Vérifiez votre connexion internet et réessayez.")), 20000)
      );

      const result = await Promise.race([signInPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      console.log('📥 [handleSignIn] Response received:', {
        duration: `${duration}ms`,
        hasError: !!result.error,
        hasData: !!result.data,
        hasUser: !!result.data?.user,
        errorStatus: result.error?.status,
        errorName: result.error?.name,
      });

      if (result.error) {
        // Logger les détails complets de l'erreur
        const errorDetails = {
          message: result.error.message,
          status: result.error.status,
          name: result.error.name,
          // Essayer d'extraire plus d'informations de l'erreur
          errorString: JSON.stringify(result.error, Object.getOwnPropertyNames(result.error)),
        };

        console.error('❌ [handleSignIn] Login error details:', errorDetails);

        // Déterminer le type d'erreur et le message approprié
        let errorMessage = "Identifiant ou mot de passe incorrect.";
        let errorType = 'credentials';
        
        // Vérifier le message d'erreur et le code d'abord
        // Supabase peut retourner 400 pour "Invalid login credentials" au lieu de 401
        const errorMessageLower = result.error.message?.toLowerCase() || '';
        const errorCode = (result.error as any).code || '';
        const isInvalidCredentials = 
          errorMessageLower.includes('invalid login credentials') ||
          errorMessageLower.includes('invalid credentials') ||
          errorMessageLower.includes('wrong password') ||
          errorMessageLower.includes('user not found') ||
          errorCode === 'invalid_credentials';
        
        console.log('🔍 [handleSignIn] Error analysis:', {
          status: result.error.status,
          message: result.error.message,
          code: errorCode,
          isInvalidCredentials,
        });
        
        if (result.error.status === 400) {
          // Erreur 400 = Bad Request
          // Mais Supabase retourne parfois 400 pour "Invalid login credentials" au lieu de 401
          if (isInvalidCredentials) {
            // C'est en fait une erreur d'identifiants, pas technique
            errorType = 'credentials';
            errorMessage = "Identifiant ou mot de passe incorrect.";
          } else {
            // Vraie erreur technique 400
            errorType = 'technical';
            
            if (result.error.message) {
              const errorLower = result.error.message.toLowerCase();
              
              // Vérifier les causes spécifiques d'erreur 400 technique
              if (errorLower.includes('invalid request') || errorLower.includes('bad request')) {
                errorMessage = "Requête invalide. Vérifiez que votre email et mot de passe sont correctement formatés.";
              } else if (errorLower.includes('email') && errorLower.includes('invalid') && !errorLower.includes('login')) {
                errorMessage = "Format d'email invalide. Vérifiez votre adresse email.";
              } else if (errorLower.includes('password') && (errorLower.includes('required') || errorLower.includes('empty'))) {
                errorMessage = "Le mot de passe est requis.";
              } else {
                // Message technique générique pour 400
                errorMessage = `Erreur technique (${result.error.status}): ${result.error.message || 'Requête invalide'}`;
              }
            } else {
              errorMessage = `Erreur technique (400): La requête de connexion est invalide.`;
            }
          }
        } else if (result.error.status === 401) {
          // Erreur 401 = Unauthorized = identifiants incorrects
          errorType = 'credentials';
          if (result.error.message) {
            const errorLower = result.error.message.toLowerCase();
            if (errorLower.includes('invalid login credentials') || errorLower.includes('invalid credentials')) {
              errorMessage = "Identifiant ou mot de passe incorrect.";
            } else if (errorLower.includes('email not confirmed')) {
              errorMessage = "Votre compte n'a pas été confirmé. Vérifiez votre email.";
            } else {
              errorMessage = result.error.message;
            }
          }
        } else if (result.error.status === 422) {
          // Erreur 422 = Validation error
          errorType = 'validation';
          errorMessage = "Les données fournies sont invalides. Vérifiez votre email et mot de passe.";
        } else if (result.error.status === 429) {
          // Erreur 429 = Too Many Requests
          errorType = 'rate_limit';
          errorMessage = "Trop de tentatives de connexion. Veuillez patienter quelques instants.";
        } else if (result.error.message) {
          const errorLower = result.error.message.toLowerCase();
          
          // Erreurs de réseau
          if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('failed to fetch')) {
            errorType = 'network';
            errorMessage = "Erreur de connexion au serveur. Vérifiez votre connexion internet.";
          }
          // Autres erreurs avec message
          else {
            errorMessage = result.error.message;
          }
        }

        console.error(`❌ [handleSignIn] Error type: ${errorType}, Final message: ${errorMessage}`);

        // Afficher l'erreur dans l'interface
        setError(errorMessage);
        
        toast({
          title: errorType === 'technical' ? "Erreur technique" : errorType === 'network' ? "Erreur de connexion" : "Erreur de connexion",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Succès
      console.log('✅ [handleSignIn] Login successful:', {
        userId: result.data?.user?.id,
        email: result.data?.user?.email,
        duration: `${duration}ms`,
      });

      // La navigation se fait automatiquement via useEffect
    } catch (error: any) {
      // Erreur inattendue (pas de réponse de Supabase)
      console.error('💥 [handleSignIn] Unexpected exception:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack?.substring(0, 200),
      });

      const errorMessage = error?.message || "Une erreur inattendue s'est produite. Veuillez réessayer.";
      setError(errorMessage);
      
      toast({
        title: "Erreur inattendue",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Rediriger vers la page dédiée de réinitialisation
    // Si l'email est déjà rempli, le passer en paramètre
    const emailParam = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    navigate(`/forgot-password${emailParam}`);
  };


  // Connexion avec Google - Nécessite une invitation
  const handleGoogleSignIn = async () => {
    if (!email || email.trim() === "") {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre email pour vérifier votre invitation avant de continuer.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier qu'il y a une invitation valide
    const { data: hasInvitation, error: checkError } = await supabase.rpc(
      'has_valid_invitation',
      { p_email: email }
    );

    if (checkError) {
      console.error('Error checking invitation:', checkError);
    }

    if (!hasInvitation) {
      toast({
        title: "Connexion non autorisée",
        description: "Vous devez avoir reçu une invitation pour vous connecter. Contactez votre administrateur.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      
      setLoading(false);
      toast({
        title: "Erreur de connexion Google",
        description: error.message || "Impossible de se connecter avec Google. Vérifiez la configuration OAuth.",
        variant: "destructive",
      });
    }
  };

  // Connexion avec Apple - Nécessite une invitation
  const handleAppleSignIn = async () => {
    if (!email || email.trim() === "") {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre email pour vérifier votre invitation avant de continuer.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier qu'il y a une invitation valide
    const { data: hasInvitation, error: checkError } = await supabase.rpc(
      'has_valid_invitation',
      { p_email: email }
    );

    if (checkError) {
      console.error('Error checking invitation:', checkError);
    }

    if (!hasInvitation) {
      toast({
        title: "Connexion non autorisée",
        description: "Vous devez avoir reçu une invitation pour vous connecter. Contactez votre administrateur.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Erreur de connexion Apple",
        description: error.message || "Impossible de se connecter avec Apple. Vérifiez la configuration OAuth.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl sm:text-2xl">B</span>
            </div>
            <span className="font-bold text-xl sm:text-2xl text-foreground">BTP Smart Pro</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bienvenue</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Connectez-vous pour accéder à votre espace</p>
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border border-border/50">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>Connectez-vous à votre compte</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm sm:text-base">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // Effacer l'erreur quand l'utilisateur modifie l'email
                        if (error) setError(null);
                      }}
                      required
                      disabled={loading}
                      className={`text-sm sm:text-base h-9 sm:h-10 ${
                        error ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm sm:text-base">Mot de passe</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        // Effacer l'erreur quand l'utilisateur modifie le mot de passe
                        if (error) setError(null);
                      }}
                      required
                      disabled={loading}
                      minLength={6}
                      className={`text-sm sm:text-base h-9 sm:h-10 ${
                        error ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {error && (
                      <Alert variant="destructive" className="p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 [&>svg]:relative [&>svg]:left-0 [&>svg]:top-0 [&>svg~*]:pl-0 [&>svg+div]:translate-y-0">
                        <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <AlertDescription className="text-xs leading-tight">{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm font-normal"
                        onClick={handlePasswordReset}
                        disabled={loading}
                      >
                        Mot de passe oublié ?
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full text-sm sm:text-base h-9 sm:h-10" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Se connecter
                  </Button>
                  
                  {/* Séparateur */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Ou continuer avec
                      </span>
                    </div>
                  </div>

                  {/* Boutons OAuth */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full text-xs sm:text-sm h-9 sm:h-10 bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/30"
                    >
                      <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAppleSignIn}
                      disabled={loading}
                      className="w-full"
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Apple
                    </Button>
                  </div>
                </form>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Auth;
