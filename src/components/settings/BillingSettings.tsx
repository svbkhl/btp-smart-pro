/**
 * Paramètres Abonnement B2B (1 company = 1 Stripe = 1 Subscription).
 * Statut, fin d'essai, fin de période, lien portail client Stripe.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, ExternalLink, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Essai gratuit",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  unpaid: "Impayé",
  paused: "En pause",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const BillingSettings = () => {
  const { toast } = useToast();
  const { subscription, isActive, isLoading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-portal", {});
      if (error) throw error;
      const url = data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error("Aucune URL reçue");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible d'ouvrir le portail";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement de l'abonnement...</span>
        </div>
      </GlassCard>
    );
  }

  const status = subscription?.subscription_status ?? null;
  const statusLabel = status ? STATUS_LABELS[status] ?? status : "Aucun abonnement";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Abonnement</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Gérez votre abonnement BTP Smart Pro : statut, facturation et moyen de paiement.
        </p>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Statut :</span>
            <Badge variant={isActive ? "default" : "secondary"}>{statusLabel}</Badge>
          </div>

          {subscription?.trial_end && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Fin de l'essai gratuit : {formatDate(subscription.trial_end)}</span>
            </div>
          )}

          {subscription?.current_period_end && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Fin de la période en cours : {formatDate(subscription.current_period_end)}</span>
            </div>
          )}

          {subscription?.cancel_at_period_end && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Votre abonnement est résilié en fin de période. Vous conservez l'accès jusqu'au{" "}
                {formatDate(subscription.current_period_end)}.
              </span>
            </div>
          )}

          {subscription?.stripe_customer_id && (
            <Button
              onClick={openPortal}
              disabled={portalLoading}
              className="gap-2"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Gérer l'abonnement (factures, moyen de paiement)
            </Button>
          )}

          {!subscription?.subscription_status && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Aucun abonnement actif. Démarrez un essai gratuit pour débloquer l'accès.
              </p>
              <Button asChild variant="outline" className="w-fit">
                <Link to="/start">Choisir un abonnement</Link>
              </Button>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};
