/**
 * Accept Invitation Page
 * 
 * Page pour accepter une invitation et créer un compte
 * Accessible via /accept-invitation?token=XXX
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulaire
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');

  useEffect(() => {
    if (token) {
      verifyInvitation();
    } else {
      setError('Token d\'invitation manquant');
      setLoading(false);
    }
  }, [token]);

  const verifyInvitation = async () => {
    if (!token) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (fetchError || !data) {
        setError('Invitation invalide ou expirée');
        setLoading(false);
        return;
      }

      // Vérifier que l'invitation n'est pas expirée
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError('Cette invitation a expiré');
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification de l\'invitation');
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword || !nom || !prenom) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs',
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

    if (password.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      // Vérifier que l'email de l'invitation correspond
      if (!invitation || !invitation.email) {
        throw new Error('Email invalide');
      }

      // Créer le compte utilisateur
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            nom,
            prenom,
            statut: invitation.role === 'owner' ? 'admin' : 'member',
            full_name: `${prenom} ${nom}`,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Impossible de créer le compte');
      }

      // Accepter l'invitation (assigner à l'entreprise)
      const { data: acceptData, error: acceptError } = await supabase.rpc(
        'accept_invitation',
        {
          p_token: token,
          p_user_id: authData.user.id,
        }
      );

      if (acceptError) {
        // Nettoyer : supprimer le compte créé si possible
        console.error('Error accepting invitation:', acceptError);
        throw acceptError;
      }

      // Créer le profil dans employees si nécessaire
      if (invitation.role !== 'owner') {
        await supabase.from('employees').insert({
          user_id: authData.user.id,
          nom,
          prenom,
          email: invitation.email,
          poste: invitation.role === 'admin' ? 'Administrateur' : 'Salarié',
        });
      }

      toast({
        title: 'Compte créé avec succès !',
        description: `Vous avez rejoint ${invitation.companies?.name || 'l\'entreprise'}`,
      });

      // Rediriger vers la connexion
      setTimeout(() => {
        navigate('/auth?message=account-created');
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible d\'accepter l\'invitation',
        variant: 'destructive',
      });
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <GlassCard className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Vérification de l'invitation...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-3 sm:p-4">
        <GlassCard className="p-6 sm:p-8 md:p-12 max-w-md w-full">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Invitation invalide</h1>
              <p className="text-muted-foreground">
                {error || 'Cette invitation n\'existe pas ou a expiré'}
              </p>
            </div>
            <Button onClick={() => navigate('/auth')} className="rounded-xl">
              Retour à la connexion
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-3 sm:p-4">
      <GlassCard className="p-4 sm:p-6 md:p-8 max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 w-16 h-16 mx-auto flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Invitation reçue</h1>
            <p className="text-muted-foreground">
              Vous avez été invité à rejoindre <strong>{invitation.companies?.name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Rôle : {invitation.role === 'owner' ? 'Dirigeant' : invitation.role === 'admin' ? 'Administrateur' : 'Membre'}
            </p>
          </div>

          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  placeholder="Votre prénom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Minimum 6 caractères"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Répétez le mot de passe"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={creating}
              className="w-full gap-2 rounded-xl"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Créer mon compte et accepter l'invitation
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            En créant un compte, vous acceptez de rejoindre {invitation.companies?.name}
          </p>
        </motion.div>
      </GlassCard>
    </div>
  );
};

export default AcceptInvitation;


