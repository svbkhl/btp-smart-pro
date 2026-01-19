/**
 * Page de réinitialisation de mot de passe
 * 
 * Route: /reset-password?token=XXX&type=recovery
 * 
 * Cette page permet aux utilisateurs de réinitialiser leur mot de passe
 * après avoir cliqué sur le lien reçu par email.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2, XCircle, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

// Déclaration de type pour la propriété globale window
declare global {
  interface Window {
    __IS_PASSWORD_RESET_PAGE__?: boolean;
  }
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // CRITIQUE : Définir le flag IMMÉDIATEMENT pour empêcher les redirections automatiques
    // Ce flag doit être défini avant toute vérification de session
    window.__IS_PASSWORD_RESET_PAGE__ = true;

    // Vérifier si on a un token de réinitialisation dans l'URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type') || searchParams.get('type');
    
    // Vérifier aussi dans l'URL complète pour détecter les redirections Supabase
    const fullUrl = window.location.href;
    const isRecoveryInUrl = fullUrl.includes('type=recovery') || 
                            fullUrl.includes('#access_token') && (fullUrl.includes('type=recovery') || hashParams.get('type') === 'recovery');
    
    console.log('🔐 [ResetPassword] Checking recovery token:', {
      hasAccessToken: !!accessToken,
      hasType: !!type,
      type: type,
      hash: window.location.hash.substring(0, 100),
      pathname: window.location.pathname,
    });

    // Vérifier si c'est bien un token de réinitialisation
    const isRecoveryToken = type === 'recovery';

    const checkRecoverySession = async () => {
      try {
        // Si on a un token de réinitialisation dans le hash, Supabase a créé une session temporaire
        // Cette session est nécessaire pour mettre à jour le mot de passe
        // MAIS on ne veut PAS que l'utilisateur soit considéré comme "connecté" pour le reste de l'app
        if (accessToken && isRecoveryToken) {
          console.log('✅ [ResetPassword] Recovery token detected in hash');
          
          // Vérifier que la session existe (Supabase l'a créée automatiquement)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.error('❌ [ResetPassword] No session found for recovery token:', sessionError);
            setError('Lien de réinitialisation invalide ou expiré.');
            setVerifying(false);
            window.__IS_PASSWORD_RESET_PAGE__ = false;
            return;
          }

          // Session de réinitialisation détectée - permettre le formulaire
          console.log('✅ [ResetPassword] Recovery session confirmed');
          setValidToken(true);
          setVerifying(false);
          return;
        }

        // Si pas de token dans le hash mais qu'on a une session,
        // vérifier si c'est une session de réinitialisation (peut-être arrivée via redirect)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [ResetPassword] Session error:', sessionError);
          setError('Lien de réinitialisation invalide ou expiré.');
          setVerifying(false);
          window.__IS_PASSWORD_RESET_PAGE__ = false;
          return;
        }

        // Si on a une session mais pas de type=recovery dans l'URL,
        // c'est probablement une session normale (utilisateur déjà connecté)
        // On ne devrait pas être sur cette page
        if (session && !isRecoveryToken) {
          console.warn('⚠️ [ResetPassword] User has session but no recovery token - redirecting');
          // Nettoyer et rediriger vers dashboard
          window.__IS_PASSWORD_RESET_PAGE__ = false;
          navigate('/dashboard');
          return;
        }

        // Si on a une session ET c'est un token de réinitialisation
        if (session && isRecoveryToken) {
          setValidToken(true);
          setVerifying(false);
        } else {
          setError('Lien de réinitialisation invalide ou expiré.');
          setVerifying(false);
          window.__IS_PASSWORD_RESET_PAGE__ = false;
        }
      } catch (err: any) {
        console.error('❌ [ResetPassword] Error checking session:', err);
        setError('Erreur lors de la vérification du lien de réinitialisation.');
        setVerifying(false);
        window.__IS_PASSWORD_RESET_PAGE__ = false;
      }
    };

    checkRecoverySession();

    // Cleanup
    return () => {
      window.__IS_PASSWORD_RESET_PAGE__ = false;
    };
  }, [searchParams, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password || password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe doivent être identiques.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        throw updateError;
      }

      console.log('✅ [ResetPassword] Password updated successfully');
      
      // IMPORTANT: Se déconnecter après la réinitialisation du mot de passe
      // pour forcer l'utilisateur à se reconnecter avec le nouveau mot de passe
      await supabase.auth.signOut();
      
      console.log('✅ [ResetPassword] User signed out after password reset');
      
      setSuccess(true);
      toast({
        title: 'Mot de passe réinitialisé avec succès !',
        description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
      });

      // Nettoyer le flag
      window.__IS_PASSWORD_RESET_PAGE__ = false;
      
      // Rediriger vers la page de connexion après 2 secondes
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err: any) {
      console.error('❌ [ResetPassword] Error updating password:', err);
      setError(err.message || 'Erreur lors de la réinitialisation du mot de passe.');
      
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de réinitialiser le mot de passe.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // État de vérification
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Vérification du lien</h2>
              <p className="text-sm text-muted-foreground">
                Veuillez patienter pendant que nous vérifions votre lien de réinitialisation...
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Erreur de token invalide
  if (!validToken && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Lien invalide</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {error || 'Ce lien de réinitialisation est invalide ou a expiré.'}
              </p>
              <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la connexion
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Succès
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 w-16 h-16 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Mot de passe réinitialisé !</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion...
              </p>
            </div>
          </motion.div>
        </GlassCard>
      </div>
    );
  }

  // Formulaire de réinitialisation
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">B</span>
            </div>
            <span className="font-bold text-xl text-foreground">BTP Smart Pro</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Réinitialiser votre mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez un nouveau mot de passe sécurisé pour votre compte
          </p>
        </motion.div>

        {/* Formulaire */}
        <GlassCard>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Nouveau mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Nouveau mot de passe <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                  minLength={8}
                  disabled={loading}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisez au moins 8 caractères avec des lettres, chiffres et symboles
              </p>
            </div>

            {/* Confirmation mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  minLength={8}
                  disabled={loading}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation en cours...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Réinitialiser le mot de passe
                </>
              )}
            </Button>

            {/* Lien retour */}
            <div className="text-center">
              <Link
                to="/auth"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default ResetPassword;
