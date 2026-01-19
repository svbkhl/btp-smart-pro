/**
 * Page de demande de réinitialisation de mot de passe
 * 
 * Route: /forgot-password
 * 
 * Cette page permet aux utilisateurs de demander un lien de réinitialisation
 * en saisissant leur adresse email.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Pré-remplir l'email depuis l'URL si disponible
  const emailFromUrl = searchParams.get('email');
  const [email, setEmail] = useState(emailFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si l'email vient de l'URL, le pré-remplir
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Veuillez saisir une adresse email valide.');
      return;
    }

    setLoading(true);

    try {
      console.log('📧 [ForgotPassword] Sending password reset email to:', normalizedEmail);

      // Envoyer l'email de réinitialisation
      // Le template d'email doit être configuré dans Supabase Dashboard :
      // Authentication > Email Templates > Reset Password
      // Pour personnaliser le sujet et le contenu de l'email avec le branding BTP Smart Pro
      // CRITIQUE: Le redirectTo doit TOUJOURS utiliser l'URL absolue avec le domaine canonique www
      // pour garantir que Supabase redirige vers /reset-password et non vers la home
      // Si redirectTo n'est pas spécifié ou pointe vers un domaine non configuré,
      // Supabase utilise la Site URL par défaut (qui peut être la home)
      const redirectUrl = 'https://www.btpsmartpro.com/reset-password';
      
      console.log('📧 [ForgotPassword] Sending reset email with redirectTo:', redirectUrl);
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        console.error('❌ [ForgotPassword] Error sending reset email:', resetError);
        throw resetError;
      }

      console.log('✅ [ForgotPassword] Password reset email sent successfully');

      setSuccess(true);
      toast({
        title: 'Email envoyé avec succès !',
        description: `Un lien de réinitialisation a été envoyé à ${normalizedEmail}`,
      });
    } catch (err: any) {
      console.error('❌ [ForgotPassword] Error:', err);
      const errorMessage = err.message || 'Impossible d\'envoyer l\'email de réinitialisation. Veuillez réessayer.';
      setError(errorMessage);
      
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg sm:text-xl">B</span>
              </div>
              <span className="font-bold text-lg sm:text-xl text-foreground">BTP Smart Pro</span>
            </div>
          </motion.div>

          {/* Message de succès avec style glass transparent */}
          <div className="bg-white/5 dark:bg-black/10 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3 sm:space-y-4"
            >
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-2">Email envoyé !</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 px-2">
                  Un lien de réinitialisation a été envoyé à :
                </p>
                <p className="text-xs sm:text-sm font-medium text-foreground mb-3 sm:mb-4 break-all px-2">
                  {email}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
                  Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
                </p>
                <p className="text-xs text-muted-foreground px-2">
                  Si vous ne recevez pas l'email dans les prochaines minutes, vérifiez votre dossier spam.
                </p>
              </div>
              
              <div className="pt-2 sm:pt-4">
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full h-9 sm:h-10 text-sm sm:text-base"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la connexion
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg sm:text-xl">B</span>
            </div>
            <span className="font-bold text-lg sm:text-xl text-foreground">BTP Smart Pro</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground px-2">Mot de passe oublié ?</h1>
          <p className="text-xs sm:text-sm text-muted-foreground px-2">
            Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
          </p>
        </motion.div>

        {/* Formulaire avec style glass transparent */}
        <div className="bg-white/5 dark:bg-black/10 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Champ email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm font-medium">
                Adresse email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="votre@email.com"
                required
                disabled={loading}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 px-4 text-sm sm:text-base h-9 sm:h-10"
                autoFocus
              />
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full h-9 sm:h-10 text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Envoi en cours...</span>
                  <span className="sm:hidden">Envoi...</span>
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Envoyer le lien de réinitialisation</span>
                  <span className="sm:hidden">Envoyer le lien</span>
                </>
              )}
            </Button>

            {/* Lien retour */}
            <div className="text-center pt-2">
              <Link
                to="/auth"
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
