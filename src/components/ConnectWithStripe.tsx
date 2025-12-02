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

  // Vérifier si Stripe est connecté (à implémenter avec une table ou user_settings)
  // Pour l'instant, on simule avec localStorage
  useEffect(() => {
    const connected = localStorage.getItem("stripe_connected") === "true";
    const accountId = localStorage.getItem("stripe_account_id");
    setStripeConnected(connected);
    setStripeAccountId(accountId);
  }, []);

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
      // TODO: Implémenter la connexion Stripe Connect
      // Pour l'instant, on simule
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Simuler la connexion
      const mockAccountId = `acct_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("stripe_connected", "true");
      localStorage.setItem("stripe_account_id", mockAccountId);
      setStripeConnected(true);
      setStripeAccountId(mockAccountId);

      toast({
        title: "Stripe connecté",
        description: "Votre compte Stripe a été connecté avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de connecter Stripe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.removeItem("stripe_connected");
      localStorage.removeItem("stripe_account_id");
      setStripeConnected(false);
      setStripeAccountId(null);

      toast({
        title: "Stripe déconnecté",
        description: "Votre compte Stripe a été déconnecté.",
      });
    } catch (error: any) {
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

