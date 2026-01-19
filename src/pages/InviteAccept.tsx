/**
 * Page d'acceptation d'invitation SaaS Pro
 * 
 * Route: /invite/accept?invite_id=XXX&token=XXX
 * 
 * Flow:
 * 1. Vérifier l'invitation via verify-invite Edge Function
 * 2. Afficher formulaire onboarding (email pré-rempli, prénom, nom, password)
 * 3. Accepter via accept-invite Edge Function
 * 4. Se connecter automatiquement et rediriger vers dashboard
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Mail, AlertCircle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface InviteInfo {
  company_name: string;
  email: string;
  role: 'admin' | 'member';
  expires_at: string;
}

type InviteStatus = 'loading' | 'valid' | 'expired' | 'accepted' | 'revoked' | 'invalid' | 'error';

const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const inviteId = searchParams.get('invite_id');
  const token = searchParams.get('token');

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Formulaire
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteId || !token) {
      setStatus('invalid');
      setErrorMessage('Lien d\'invitation invalide. Il manque l\'identifiant ou le token.');
      return;
    }

    verifyInvite();
  }, [inviteId, token]);

  const verifyInvite = async () => {
    if (!inviteId || !token) return;

    try {
      setStatus('loading');
      setErrorMessage('');

      // Utiliser fetch directement pour avoir plus de contrôle sur la gestion d'erreur
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setStatus('error');
        setErrorMessage('Configuration manquante. Veuillez contacter le support.');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ invite_id: inviteId, token }),
      });

      console.log("📥 [verifyInvite] Response status:", response.status);
      console.log("📥 [verifyInvite] Response ok:", response.ok);

      // Lire le corps de la réponse
      const responseText = await response.text();
      console.log("📥 [verifyInvite] Response text:", responseText);

      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error("❌ Error parsing response:", e);
      }

      console.log("📥 [verifyInvite] Response data:", data);

      // Si la réponse n'est pas OK, extraire l'erreur
      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `Erreur ${response.status}: ${response.statusText}`;
        
        // Gérer les différents cas d'erreur
        if (data?.status === 'accepted' || errorMessage.includes('already accepted')) {
          setStatus('accepted');
          setErrorMessage('Cette invitation a déjà été acceptée');
        } else if (data?.status === 'revoked' || errorMessage.includes('revoked')) {
          setStatus('revoked');
          setErrorMessage('Cette invitation a été révoquée');
        } else if (data?.status === 'expired' || errorMessage.includes('expired')) {
          setStatus('expired');
          setErrorMessage('Cette invitation a expiré');
        } else if (errorMessage.includes('not found')) {
          setStatus('invalid');
          setErrorMessage('Invitation non trouvée');
        } else if (errorMessage.includes('Invalid token')) {
          setStatus('invalid');
          setErrorMessage('Token invalide');
        } else {
          setStatus('error');
          setErrorMessage(errorMessage);
        }
        return;
      }

      // Traiter la réponse de succès
      if (data?.valid) {
        setInviteInfo({
          company_name: data.company_name,
          email: data.email,
          role: data.role,
          expires_at: data.expires_at,
        });
        setStatus('valid');
      } else if (data?.error) {
        // Gérer les erreurs même si status est OK
        if (data.status === 'accepted') {
          setStatus('accepted');
          setErrorMessage('Cette invitation a déjà été acceptée');
        } else if (data.status === 'revoked') {
          setStatus('revoked');
          setErrorMessage('Cette invitation a été révoquée');
        } else if (data.status === 'expired' || data.error === 'Invitation expired') {
          setStatus('expired');
          setErrorMessage('Cette invitation a expiré');
        } else {
          setStatus('invalid');
          setErrorMessage(data.message || data.error || 'Invitation invalide');
        }
      } else {
        setStatus('invalid');
        setErrorMessage('Invitation invalide');
      }
    } catch (err: any) {
      console.error('❌ Exception verifying invite:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Erreur lors de la vérification de l\'invitation');
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir votre prénom et nom',
        variant: 'destructive',
      });
      return;
    }

    if (!password || password.length < 8) {
      toast({
        title: 'Mot de passe invalide',
        description: 'Le mot de passe doit contenir au moins 8 caractères',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
      return;
    }

    if (!inviteId || !token) {
      toast({
        title: 'Erreur',
        description: 'Lien d\'invitation invalide',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Utiliser fetch directement pour avoir plus de contrôle sur la gestion d'erreur
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        toast({
          title: 'Erreur',
          description: 'Configuration manquante. Veuillez contacter le support.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          invite_id: inviteId,
          token,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password: password.trim(), // S'assurer que le mot de passe n'a pas d'espaces
        }),
      });

      console.log("📥 [handleAccept] Response status:", response.status);
      console.log("📥 [handleAccept] Response ok:", response.ok);

      // Lire le corps de la réponse
      const responseText = await response.text();
      console.log("📥 [handleAccept] Response text:", responseText);

      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error("❌ Error parsing response:", e);
      }

      console.log("📥 [handleAccept] Response data:", data);

      // Si la réponse n'est pas OK, extraire l'erreur
      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `Erreur ${response.status}: ${response.statusText}`;
        
        toast({
          title: 'Erreur',
          description: errorMessage,
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      // Vérifier si data contient une erreur (même si status est OK)
      if (data?.error) {
        toast({
          title: 'Erreur',
          description: data.message || data.error || 'Impossible d\'accepter l\'invitation',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      if (data?.success) {
        // Si c'est un nouveau compte, se connecter automatiquement
        if (data.is_new_user) {
          // Utiliser l'email de la réponse si disponible, sinon celui de inviteInfo
          const userEmail = data.email || inviteInfo?.email;
          
          console.log('🔐 Attempting to sign in with:', { 
            email: userEmail, 
            passwordLength: password?.length || 0,
            isNewUser: data.is_new_user 
          });

          if (!userEmail) {
            console.error('❌ No email available for sign in');
            toast({
              title: 'Compte créé',
              description: 'Votre compte a été créé. Veuillez vous connecter avec votre email et mot de passe.',
              variant: 'default',
            });
            navigate(`/auth?message=account-created&email=${encodeURIComponent(inviteInfo?.email || '')}`);
            setSubmitting(false);
            return;
          }

          // Normaliser l'email (lowercase, trim)
          const normalizedEmail = userEmail.toLowerCase().trim();
          
          // S'assurer que le mot de passe est trim() (pas d'espaces avant/après)
          const cleanPassword = password.trim();
          
          console.log('🔐 [signIn] Preparing to sign in:', {
            email: normalizedEmail,
            passwordLength: cleanPassword.length,
            passwordPreview: cleanPassword.substring(0, 2) + '***' + cleanPassword.substring(cleanPassword.length - 2),
            emailMatch: normalizedEmail === (data.email || inviteInfo?.email)?.toLowerCase().trim(),
            password_saved: data.password_saved,
          });

          // Attendre un peu pour s'assurer que le compte est bien créé et disponible dans la base
          // Supabase peut avoir besoin d'un moment pour finaliser la création du compte
          console.log('⏳ Waiting 3 seconds before sign in to ensure account is fully created...');
          await new Promise(resolve => setTimeout(resolve, 3000));

          console.log('🔐 [signIn] Attempting sign in now with:', {
            email: normalizedEmail,
            passwordLength: cleanPassword.length,
          });

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: cleanPassword, // Utiliser le mot de passe nettoyé
          });

          if (signInError) {
            console.error('❌ Error signing in:', signInError);
            console.error('❌ Sign in error details:', {
              message: signInError.message,
              status: signInError.status,
              name: signInError.name,
            });
            console.error('❌ Attempted credentials:', {
              email: normalizedEmail,
              passwordLength: password?.length || 0,
            });
            
            // Afficher un message plus détaillé
            let errorMessage = 'Votre compte a été créé, mais la connexion automatique a échoué.';
            if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed')) {
              errorMessage = `Votre compte a été créé avec l'email ${normalizedEmail}. Veuillez vous connecter avec cet email et le mot de passe que vous avez saisi lors de la création du compte.`;
            } else if (signInError.message.includes('Email not confirmed')) {
              errorMessage = 'Votre compte a été créé. Veuillez vérifier votre email pour confirmer votre compte.';
            }
            
            toast({
              title: 'Compte créé avec succès !',
              description: errorMessage,
              variant: 'default',
            });
            
            // Pré-remplir l'email dans l'URL pour faciliter la connexion
            navigate(`/auth?email=${encodeURIComponent(normalizedEmail)}&message=account-created`);
            setSubmitting(false);
            return;
          }

          console.log('✅ Sign in successful:', signInData);

          toast({
            title: 'Invitation acceptée !',
            description: `Bienvenue chez ${data.company_name || inviteInfo?.company_name || 'l\'entreprise'}`,
          });

          // Rediriger vers le dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else if (data.already_member) {
          // L'utilisateur était déjà membre
          toast({
            title: 'Invitation acceptée',
            description: data.message || 'Vous êtes déjà membre de cette entreprise',
          });
          navigate('/auth?message=already-member');
        } else {
          // Compte existant mais pas membre - ajouté à l'entreprise
          // L'utilisateur doit se connecter
          toast({
            title: 'Invitation acceptée',
            description: 'Vous avez été ajouté à l\'entreprise. Veuillez vous connecter.',
          });
          navigate('/auth?message=invite-accepted');
        }
      } else {
        toast({
          title: 'Erreur',
          description: 'Réponse inattendue du serveur',
          variant: 'destructive',
        });
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error('Exception accepting invite:', err);
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de l\'acceptation de l\'invitation',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  // État de chargement
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-12 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-center">Vérification de l'invitation...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  // États d'erreur
  if (status === 'invalid' || status === 'error' || status === 'expired' || status === 'accepted' || status === 'revoked') {
    const getErrorIcon = () => {
      switch (status) {
        case 'expired':
          return <XCircle className="h-16 w-16 text-orange-500" />;
        case 'accepted':
          return <CheckCircle2 className="h-16 w-16 text-blue-500" />;
        case 'revoked':
          return <XCircle className="h-16 w-16 text-red-500" />;
        default:
          return <XCircle className="h-16 w-16 text-red-500" />;
      }
    };

    const getErrorTitle = () => {
      switch (status) {
        case 'expired':
          return 'Invitation expirée';
        case 'accepted':
          return 'Invitation déjà acceptée';
        case 'revoked':
          return 'Invitation annulée';
        default:
          return 'Invitation invalide';
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6">
              {getErrorIcon()}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{getErrorTitle()}</h1>
              <p className="text-muted-foreground">
                {errorMessage || 'Cette invitation n\'est plus valide'}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {status === 'expired' && (
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="rounded-xl"
                >
                  Demander une nouvelle invitation
                </Button>
              )}
              <Button onClick={() => navigate('/auth')} className="rounded-xl">
                Retour à la connexion
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Formulaire d'onboarding
  if (status === 'valid' && inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-6 md:p-8 max-w-lg w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Message de bienvenue moderne */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="rounded-full bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 p-6 w-20 h-20 mx-auto flex items-center justify-center shadow-lg"
              >
                <Mail className="h-10 w-10 text-white" />
              </motion.div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Bienvenue ! 👋
                </h1>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">
                    Vous avez été invité à rejoindre
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {inviteInfo.company_name}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Badge variant={inviteInfo.role === 'admin' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                    {inviteInfo.role === 'admin' ? 'Administrateur' : 'Membre'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground pt-2">
                  Créez votre compte pour commencer à utiliser BTP Smart Pro
                </p>
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleAccept} className="space-y-4">
              {/* Email (verrouillé) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={inviteInfo.email}
                    disabled
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 pr-10 text-sm sm:text-base"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cet email a été défini par l'entreprise et ne peut pas être modifié
                </p>
              </div>

              {/* Prénom et Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    Prénom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Votre prénom"
                    disabled={submitting}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Votre nom"
                    disabled={submitting}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 caractères"
                  minLength={8}
                  disabled={submitting}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Le mot de passe doit contenir au moins 8 caractères. Choisissez un mot de passe sécurisé.
                </p>
              </div>

              {/* Confirmation mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmer le mot de passe <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Répétez le mot de passe"
                  minLength={8}
                  disabled={submitting}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
                />
              </div>

              {/* Bouton submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full gap-2 rounded-xl"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Créer mon compte et rejoindre l'entreprise
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-xs text-center text-muted-foreground">
              En créant un compte, vous acceptez de rejoindre {inviteInfo.company_name}
            </p>
          </motion.div>
        </GlassCard>
      </div>
    );
  }

  // État par défaut (ne devrait jamais arriver)
  return null;
};

export default InviteAccept;
