/**
 * Page de callback Stripe Connect
 * Cette page est appelée après que l'utilisateur a complété l'onboarding Stripe
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const StripeCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'warning' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification de votre connexion Stripe...');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const processCallback = async () => {
      if (!user) {
        setStatus('error');
        setMessage('Vous devez être connecté');
        return;
      }

      // Récupérer stripe_connect_account_id depuis la company de l'utilisateur (owner)
      const { data: membership } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!membership?.company_id) {
        setStatus('error');
        setMessage('Vous devez être propriétaire d\'une entreprise');
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('stripe_connect_account_id')
        .eq('id', membership.company_id)
        .single();

      if (companyError || !company?.stripe_connect_account_id) {
        setStatus('error');
        setMessage('Impossible de récupérer les informations Stripe de votre entreprise');
        return;
      }

      try {
        console.log('✅ Processing Stripe callback for company account:', company.stripe_connect_account_id);

        const { data, error } = await supabase.functions.invoke('stripe-connect-callback', {
          body: {
            account_id: company.stripe_connect_account_id,
          },
        });

        if (error) {
          console.error('❌ Error in callback:', error);
          throw error;
        }

        console.log('📊 Callback result:', data);

        setDetails(data.status);

        if (data.fully_configured) {
          setStatus('success');
          setMessage('Votre compte Stripe est entièrement configuré !');
        } else if (data.connected) {
          setStatus('warning');
          setMessage('Votre compte Stripe est partiellement configuré');
        } else {
          setStatus('warning');
          setMessage('Configuration Stripe en attente');
        }

        // Rediriger vers les paramètres après 3 secondes
        setTimeout(() => {
          navigate('/settings', { replace: true });
        }, 3000);

      } catch (error: any) {
        console.error('❌ Error processing Stripe callback:', error);
        setStatus('error');
        setMessage('Erreur lors de la vérification de votre compte Stripe');
      }
    };

    processCallback();
  }, [user, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-16 w-16 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getAlertVariant = () => {
    switch (status) {
      case 'success':
        return 'default';
      case 'warning':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <GlassCard className="max-w-2xl w-full p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          {getIcon()}

          <div>
            <h1 className="text-2xl font-bold mb-2">
              {status === 'loading' ? 'Vérification en cours...' : 'Connexion Stripe'}
            </h1>
            <p className="text-muted-foreground">{message}</p>
          </div>

          {details && (
            <Alert variant={getAlertVariant()} className="text-left">
              <AlertTitle>État de votre compte Stripe</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center gap-2">
                    {details.charges_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>
                      Paiements par carte : {details.charges_enabled ? 'Activés' : 'Non activés'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {details.payouts_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>
                      Versements : {details.payouts_enabled ? 'Activés' : 'Non activés'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {details.details_submitted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>
                      Informations : {details.details_submitted ? 'Complètes' : 'Incomplètes'}
                    </span>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {status !== 'loading' && (
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="gap-2 rounded-xl"
              >
                Aller aux Paramètres
              </Button>
              {status === 'warning' && (
                <Button
                  onClick={() => window.location.reload()}
                  className="gap-2 rounded-xl"
                >
                  Réessayer
                </Button>
              )}
            </div>
          )}

          {status === 'loading' && (
            <p className="text-sm text-muted-foreground">
              Redirection automatique vers les paramètres...
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default StripeCallback;
