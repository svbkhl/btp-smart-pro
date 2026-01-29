import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const ConnectWithStripe = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

  // Vérifier si Stripe est connecté en récupérant les données de Supabase
  useEffect(() => {
    const checkStripeConnection = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('stripe_account_id, stripe_connected')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking Stripe connection:', error);
          return;
        }

        if (data?.stripe_account_id && data?.stripe_connected) {
          setStripeConnected(true);
          setStripeAccountId(data.stripe_account_id);
        }
      } catch (error) {
        console.error('Error checking Stripe connection:', error);
      }
    };

    checkStripeConnection();
  }, [user]);

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour connecter Stripe",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🔗 Creating Stripe Connect link...');
      
      // Appeler l'Edge Function pour créer le lien Stripe Connect
      const { data, error } = await supabase.functions.invoke('stripe-create-account-link', {
        body: { user_id: user.id },
      });

      if (error) {
        console.error('❌ Error creating Stripe link:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No URL returned from Stripe');
      }

      console.log('✅ Stripe link created, redirecting...');

      // Rediriger vers Stripe pour l'onboarding
      window.location.href = data.url;

    } catch (error: any) {
      console.error('❌ Error connecting Stripe:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le lien Stripe Connect",
        variant: "destructive",
      });
      setLoading(false);
    }
    // Note: on ne met pas setLoading(false) ici car on redirige vers Stripe
  };

  const handleDisconnect = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mettre à jour la base de données pour marquer la déconnexion
      const { error } = await supabase
        .from('user_settings')
        .update({
          stripe_connected: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setStripeConnected(false);
      setStripeAccountId(null);

      toast({
        title: "Stripe déconnecté",
        description: "Votre compte Stripe a été déconnecté. Vous pouvez le reconnecter à tout moment.",
      });
    } catch (error: any) {
      console.error('Error disconnecting Stripe:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de déconnecter Stripe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = () => {
    if (stripeAccountId) {
      window.open(`https://dashboard.stripe.com/connect/accounts/${stripeAccountId}`, "_blank");
    } else {
      window.open("https://dashboard.stripe.com", "_blank");
    }
  };

  return (
    <div className="space-y-4">
      {stripeConnected ? (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-900 dark:text-green-100">
              Stripe Connect activé
            </span>
          </div>
          {stripeAccountId && (
            <p className="text-sm text-muted-foreground mb-3">
              Compte: <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">{stripeAccountId}</code>
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDashboard}
              className="gap-2 rounded-xl"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir le dashboard Stripe
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={loading}
              className="gap-2 rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Déconnecter
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Connecter votre compte Stripe</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connectez votre compte Stripe pour accepter les paiements en ligne
          </p>
          <Button
            onClick={handleConnect}
            disabled={loading}
            className="gap-2 rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Connecter avec Stripe
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

