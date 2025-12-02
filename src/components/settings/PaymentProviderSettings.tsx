/**
 * Payment Provider Settings Component
 * 
 * Permet aux entreprises de configurer leur payment provider préféré
 */

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PaymentProviderType } from '@/payment_providers/types/PaymentTypes';

const PROVIDER_INFO: Record<PaymentProviderType, { name: string; description: string; website: string }> = {
  stripe: {
    name: 'Stripe',
    description: 'Solution de paiement internationale, la plus utilisée',
    website: 'https://stripe.com',
  },
  sumup: {
    name: 'SumUp',
    description: 'Idéal pour les paiements sur chantier avec terminal mobile',
    website: 'https://sumup.com',
  },
  payplug: {
    name: 'PayPlug',
    description: 'Solution française, simple et adaptée aux PME',
    website: 'https://payplug.com',
  },
  stancer: {
    name: 'Stancer',
    description: 'Alternative française à Stripe, supporte SEPA',
    website: 'https://stancer.com',
  },
  gocardless: {
    name: 'GoCardless',
    description: 'Spécialisé dans les prélèvements SEPA et paiements récurrents',
    website: 'https://gocardless.com',
  },
};

export const PaymentProviderSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType>('stripe');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadProviderConfig();
  }, [user]);

  const loadProviderConfig = async () => {
    if (!user) return;

    try {
      // Charger depuis payment_provider_credentials
      const { data } = await supabase
        .from('payment_provider_credentials')
        .select('provider_type, credentials, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (data) {
        setSelectedProvider(data.provider_type as PaymentProviderType);
        setCredentials(data.credentials || {});
        setIsConfigured(true);
      } else {
        // Fallback vers user_settings
        const { data: settings } = await supabase
          .from('user_settings')
          .select('payment_provider, payment_provider_credentials')
          .eq('user_id', user.id)
          .single();

        if (settings?.payment_provider) {
          setSelectedProvider(settings.payment_provider as PaymentProviderType);
          setCredentials(settings.payment_provider_credentials || {});
          setIsConfigured(true);
        }
      }
    } catch (error) {
      console.error('Error loading provider config:', error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Désactiver les autres providers
      await supabase
        .from('payment_provider_credentials')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Créer ou mettre à jour le provider actif
      const { error } = await supabase
        .from('payment_provider_credentials')
        .upsert({
          user_id: user.id,
          provider_type: selectedProvider,
          credentials: credentials,
          is_active: true,
        }, {
          onConflict: 'user_id,is_active',
        });

      if (error) throw error;

      // Mettre à jour user_settings aussi (pour compatibilité)
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          payment_provider: selectedProvider,
          payment_provider_credentials: credentials,
        }, {
          onConflict: 'user_id',
        });

      setIsConfigured(true);
      toast({
        title: 'Configuration sauvegardée',
        description: `Le provider ${PROVIDER_INFO[selectedProvider].name} a été configuré avec succès`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder la configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    setLoading(true);

    try {
      await supabase
        .from('payment_provider_credentials')
        .update({ is_active: false })
        .eq('user_id', user.id);

      setIsConfigured(false);
      setCredentials({});
      
      toast({
        title: 'Provider déconnecté',
        description: 'La configuration du payment provider a été supprimée',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de déconnecter le provider',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCredentialsInputs = () => {
    switch (selectedProvider) {
      case 'stripe':
        return (
          <>
            <div>
              <Label htmlFor="stripe_secret_key">Clé secrète Stripe</Label>
              <Input
                id="stripe_secret_key"
                type="password"
                placeholder="sk_live_..."
                value={credentials.secretKey || ''}
                onChange={(e) => setCredentials({ ...credentials, secretKey: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="stripe_publishable_key">Clé publique Stripe (optionnel)</Label>
              <Input
                id="stripe_publishable_key"
                type="text"
                placeholder="pk_live_..."
                value={credentials.publishableKey || ''}
                onChange={(e) => setCredentials({ ...credentials, publishableKey: e.target.value })}
              />
            </div>
          </>
        );
      case 'sumup':
        return (
          <>
            <div>
              <Label htmlFor="sumup_client_id">Client ID</Label>
              <Input
                id="sumup_client_id"
                type="text"
                placeholder="Votre Client ID SumUp"
                value={credentials.clientId || ''}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sumup_client_secret">Client Secret</Label>
              <Input
                id="sumup_client_secret"
                type="password"
                placeholder="Votre Client Secret SumUp"
                value={credentials.clientSecret || ''}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sumup_access_token">Access Token (optionnel)</Label>
              <Input
                id="sumup_access_token"
                type="password"
                placeholder="Token OAuth2"
                value={credentials.accessToken || ''}
                onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
              />
            </div>
          </>
        );
      case 'payplug':
        return (
          <div>
            <Label htmlFor="payplug_secret_key">Clé secrète PayPlug</Label>
            <Input
              id="payplug_secret_key"
              type="password"
              placeholder="sk_live_..."
              value={credentials.secretKey || ''}
              onChange={(e) => setCredentials({ ...credentials, secretKey: e.target.value })}
            />
          </div>
        );
      case 'stancer':
        return (
          <div>
            <Label htmlFor="stancer_secret_key">Clé secrète Stancer</Label>
            <Input
              id="stancer_secret_key"
              type="password"
              placeholder="sk_live_..."
              value={credentials.secretKey || ''}
              onChange={(e) => setCredentials({ ...credentials, secretKey: e.target.value })}
            />
          </div>
        );
      case 'gocardless':
        return (
          <div>
            <Label htmlFor="gocardless_access_token">Access Token GoCardless</Label>
            <Input
              id="gocardless_access_token"
              type="password"
              placeholder="sandbox_... ou live_..."
              value={credentials.accessToken || ''}
              onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Payment Providers</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Configurez votre provider de paiement préféré. Vous pouvez changer de provider à tout moment.
      </p>

      {isConfigured && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-900 dark:text-green-100">
              {PROVIDER_INFO[selectedProvider].name} configuré
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Votre provider de paiement est actif et prêt à être utilisé.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <Label htmlFor="provider">Provider de paiement</Label>
          <Select
            value={selectedProvider}
            onValueChange={(value) => {
              setSelectedProvider(value as PaymentProviderType);
              setCredentials({}); // Réinitialiser les credentials
            }}
          >
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div>
                    <div className="font-medium">{info.name}</div>
                    <div className="text-xs text-muted-foreground">{info.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            <a
              href={PROVIDER_INFO[selectedProvider].website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              En savoir plus sur {PROVIDER_INFO[selectedProvider].name}
            </a>
          </p>
        </div>

        <div className="space-y-4">
          {renderCredentialsInputs()}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="gap-2 rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Sauvegarder
              </>
            )}
          </Button>

          {isConfigured && (
            <Button
              onClick={handleDisconnect}
              disabled={loading}
              variant="destructive"
              className="gap-2 rounded-xl"
            >
              <XCircle className="h-4 w-4" />
              Déconnecter
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

