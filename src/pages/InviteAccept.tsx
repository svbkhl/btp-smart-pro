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

      const { data, error } = await supabase.functions.invoke('verify-invite', {
        body: { invite_id: inviteId, token },
      });

      if (error) {
        console.error('Error verifying invite:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Erreur lors de la vérification de l\'invitation');
        return;
      }

      if (data?.error) {
        // Gérer les différents cas d'erreur
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
        return;
      }

      if (data?.valid) {
        setInviteInfo({
          company_name: data.company_name,
          email: data.email,
          role: data.role,
          expires_at: data.expires_at,
        });
        setStatus('valid');
      } else {
        setStatus('invalid');
        setErrorMessage('Invitation invalide');
      }
    } catch (err: any) {
      console.error('Exception verifying invite:', err);
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
      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: {
          invite_id: inviteId,
          token,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password,
        },
      });

      if (error) {
        console.error('Error accepting invite:', error);
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible d\'accepter l\'invitation',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

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
        if (data.is_new_user && inviteInfo) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: inviteInfo.email,
            password,
          });

          if (signInError) {
            console.error('Error signing in:', signInError);
            toast({
              title: 'Compte créé',
              description: 'Votre compte a été créé. Veuillez vous connecter.',
            });
            navigate('/auth?message=account-created');
            return;
          }

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
        <GlassCard className="p-6 md:p-8 max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <Mail className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold">Accepter l'invitation</h1>
              <p className="text-muted-foreground">
                Vous avez été invité à rejoindre <strong>{inviteInfo.company_name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Rôle : <strong>{inviteInfo.role === 'admin' ? 'Administrateur' : 'Membre'}</strong>
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleAccept} className="space-y-4">
              {/* Email (verrouillé) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={inviteInfo.email}
                    disabled
                    className="bg-muted pr-10"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cet email ne peut pas être modifié
                </p>
              </div>

              {/* Prénom et Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Prénom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Votre prénom"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Votre nom"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password">
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
                />
                <p className="text-xs text-muted-foreground">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              </div>

              {/* Confirmation mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
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
