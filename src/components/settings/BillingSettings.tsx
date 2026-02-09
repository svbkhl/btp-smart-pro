/**
 * Paramètres Abonnement B2B (1 company = 1 Stripe = 1 Subscription).
 * Tout in-app : forfait, factures, moyen de paiement, résiliation (mensuel + annuel).
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripePlanOptions } from "@/config/stripePlans";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard,
  Loader2,
  Calendar,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

function formatAmount(cents: number | undefined, currency: string): string {
  if (cents == null) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format(cents / 100);
}

type BillingDetails = {
  invoices: Array<{
    id: string;
    number?: string;
    date?: string;
    total?: number;
    currency?: string;
    status?: string;
    hosted_invoice_url?: string;
    invoice_pdf?: string;
  }>;
  paymentMethod: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
};

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

function UpdateCardForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setLoading(true);
    try {
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
      });
      if (error) {
        toast({ title: "Erreur", description: error.message ?? "Paiement refusé", variant: "destructive" });
        setLoading(false);
        return;
      }
      const pmId = setupIntent?.payment_method;
      if (typeof pmId !== "string") {
        toast({ title: "Erreur", description: "Moyen de paiement non reçu", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error: setError } = await supabase.functions.invoke("stripe-billing-set-default-payment-method", {
        body: { payment_method_id: pmId },
      });
      if (setError) throw setError;
      toast({ title: "Carte mise à jour", description: "Votre moyen de paiement a été enregistré." });
      onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible de mettre à jour la carte";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-input bg-muted/30 p-3">
        <CardElement
          options={{
            style: {
              base: { fontSize: "16px", color: "hsl(var(--foreground))" },
              invalid: { color: "hsl(var(--destructive))" },
            },
          }}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enregistrer la carte
        </Button>
      </DialogFooter>
    </form>
  );
}

export const BillingSettings = () => {
  const { toast } = useToast();
  const { subscription, isActive, isLoading, refetch } = useSubscription();
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
  const [billingDetailsLoading, setBillingDetailsLoading] = useState(false);
  const [resiliateLoading, setResiliateLoading] = useState(false);
  const [resiliateAnnualLoading, setResiliateAnnualLoading] = useState(false);
  const [updateCardOpen, setUpdateCardOpen] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);

  const fetchBillingDetails = useCallback(async () => {
    if (!subscription?.subscription_status) return;
    setBillingDetailsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-details", {});
      if (error) throw error;
      setBillingDetails(
        data as BillingDetails
      );
    } catch {
      setBillingDetails({ invoices: [], paymentMethod: null });
    } finally {
      setBillingDetailsLoading(false);
    }
  }, [subscription?.subscription_status]);

  useEffect(() => {
    fetchBillingDetails();
  }, [fetchBillingDetails]);

  const resiliateMonthly = async () => {
    setResiliateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-resiliate-monthly", {});
      if (error) throw error;
      const msg = (data as { message?: string })?.message ?? "Résiliation programmée.";
      toast({ title: "Résiliation programmée", description: msg });
      await refetch();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible de programmer la résiliation";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setResiliateLoading(false);
    }
  };

  const resiliateAnnual = async () => {
    setResiliateAnnualLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-resiliate-annual", {});
      if (error) throw error;
      const msg = (data as { message?: string })?.message ?? "Résiliation programmée en fin de période.";
      toast({ title: "Résiliation programmée", description: msg });
      await refetch();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible de programmer la résiliation";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setResiliateAnnualLoading(false);
    }
  };

  const openUpdateCard = async () => {
    setUpdateCardOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-create-setup-intent", {});
      if (error) throw error;
      const secret = (data as { client_secret?: string })?.client_secret;
      if (secret) setSetupClientSecret(secret);
      else throw new Error("Aucune clé reçue");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible d'ouvrir le formulaire";
      toast({ title: "Erreur", description: message, variant: "destructive" });
      setUpdateCardOpen(false);
    }
  };

  const closeUpdateCard = () => {
    setUpdateCardOpen(false);
    setSetupClientSecret(null);
    fetchBillingDetails();
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

  const planOptions = getStripePlanOptions();
  const currentPlan = subscription?.stripe_price_id
    ? planOptions.find((p) => p.price_id && p.price_id === subscription.stripe_price_id)
    : null;
  const offerLabel =
    currentPlan?.label ??
    (subscription?.stripe_price_id ? "Abonnement BTP Smart Pro" : "Abonnement BTP Smart Pro");
  const offerPriceDisplay = currentPlan?.price_display;
  const isMonthlyPlan = currentPlan?.label?.toUpperCase().includes("MENSUEL") ?? false;

  const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Abonnement</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Gérez votre abonnement BTP Smart Pro : statut, factures et moyen de paiement, tout depuis cette page.
        </p>

        {!subscription?.subscription_status ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Aucun abonnement actif. Démarrez un essai gratuit pour débloquer l'accès.
            </p>
            <Button asChild variant="outline" className="w-fit">
              <Link to="/start">Choisir un abonnement</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Votre forfait */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Votre forfait</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{offerLabel}</span>
                {offerPriceDisplay && (
                  <span className="text-sm text-muted-foreground">({offerPriceDisplay})</span>
                )}
                <Badge variant={isActive ? "default" : "secondary"}>{statusLabel}</Badge>
              </div>
              {subscription?.trial_end && (
                <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Fin de l'essai gratuit : {formatDate(subscription.trial_end)}</span>
                </div>
              )}
              {subscription?.current_period_end && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Fin de la période en cours : {formatDate(subscription.current_period_end)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Factures */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Factures
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Historique de vos factures payées. Téléchargez le PDF si besoin.
              </p>
              {billingDetailsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des factures...
                </div>
              ) : billingDetails?.invoices?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={fetchBillingDetails}
                      disabled={billingDetailsLoading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <ul className="rounded-md border divide-y">
                    {billingDetails.invoices.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {inv.number ?? inv.id.slice(-8)} • {inv.date ? formatDate(inv.date) : "-"}
                        </span>
                        <span className="font-medium">
                          {inv.total != null ? formatAmount(inv.total * 100, inv.currency ?? "eur") : "-"}
                        </span>
                        {(inv.hosted_invoice_url || inv.invoice_pdf) && (
                          <a
                            href={inv.invoice_pdf ?? inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs"
                          >
                            Télécharger
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>
              )}
            </div>

            <Separator />

            {/* Moyen de paiement */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Moyen de paiement</h3>
              {billingDetailsLoading && !billingDetails ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : billingDetails?.paymentMethod ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm capitalize">
                    {billingDetails.paymentMethod.brand} •••• {billingDetails.paymentMethod.last4}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Exp. {billingDetails.paymentMethod.exp_month}/{billingDetails.paymentMethod.exp_year}
                  </span>
                  {stripePromise ? (
                    <Dialog open={updateCardOpen} onOpenChange={(open) => !open && closeUpdateCard()}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={openUpdateCard} className="gap-2">
                          <CreditCard className="h-4 w-4" />
                          Mettre à jour la carte
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nouvelle carte</DialogTitle>
                          <DialogDescription>
                            Saisissez les informations de votre nouvelle carte. Elle sera utilisée pour les prochains prélèvements.
                          </DialogDescription>
                        </DialogHeader>
                        {setupClientSecret && stripePromise && (
                          <Elements
                            stripe={stripePromise}
                            options={{
                              clientSecret: setupClientSecret,
                              appearance: { theme: "stripe" },
                            }}
                          >
                            <UpdateCardForm
                              clientSecret={setupClientSecret}
                              onSuccess={closeUpdateCard}
                              onCancel={() => setUpdateCardOpen(false)}
                            />
                          </Elements>
                        )}
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Clé publique Stripe manquante : ajoutez VITE_STRIPE_PUBLISHABLE_KEY dans .env.local (local) ou dans Vercel (production).
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-muted-foreground">Aucune carte enregistrée.</p>
                  {stripePromise ? (
                    <Dialog open={updateCardOpen} onOpenChange={(open) => !open && closeUpdateCard()}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={openUpdateCard} className="gap-2">
                          <CreditCard className="h-4 w-4" />
                          Ajouter une carte
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Moyen de paiement</DialogTitle>
                          <DialogDescription>
                            Saisissez les informations de votre carte pour les prélèvements.
                          </DialogDescription>
                        </DialogHeader>
                        {setupClientSecret && stripePromise && (
                          <Elements
                            stripe={stripePromise}
                            options={{
                              clientSecret: setupClientSecret,
                              appearance: { theme: "stripe" },
                            }}
                          >
                            <UpdateCardForm
                              clientSecret={setupClientSecret}
                              onSuccess={closeUpdateCard}
                              onCancel={() => setUpdateCardOpen(false)}
                            />
                          </Elements>
                        )}
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Clé publique Stripe manquante : ajoutez VITE_STRIPE_PUBLISHABLE_KEY dans .env.local (local) ou dans Vercel (production).
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Résilier */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Résilier l'abonnement
              </h3>
              {isMonthlyPlan ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Offre mensuelle avec engagement 1 an. La résiliation prend effet à la fin de votre engagement (1 an après la fin de l'essai). Vous serez prélevé chaque mois jusqu'à cette date.
                  </p>
                  {subscription?.cancel_at ? (
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Résiliation programmée le {formatDate(subscription.cancel_at)}. Vous conservez l'accès jusqu'à cette date.
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={resiliateMonthly}
                      disabled={resiliateLoading}
                      className="gap-2"
                    >
                      {resiliateLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Résilier (effective en fin d'engagement 1 an)
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Vous pouvez résilier à tout moment. Vous conservez l'accès jusqu'à la fin de la période en cours.
                  </p>
                  {subscription?.cancel_at_period_end ? (
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Résiliation programmée en fin de période. Vous conservez l'accès jusqu'au{" "}
                      {formatDate(subscription.current_period_end)}.
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={resiliateAnnual}
                      disabled={resiliateAnnualLoading}
                      className="gap-2"
                    >
                      {resiliateAnnualLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Résilier (effective en fin de période)
                    </Button>
                  )}
                </>
              )}
            </div>

            {(subscription?.cancel_at_period_end || subscription?.cancel_at) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {subscription.cancel_at
                    ? `Votre abonnement sera résilié le ${formatDate(subscription.cancel_at)}. Vous conservez l'accès jusqu'à cette date.`
                    : `Votre abonnement est résilié en fin de période. Vous conservez l'accès jusqu'au ${formatDate(subscription.current_period_end)}.`}
                </span>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};
