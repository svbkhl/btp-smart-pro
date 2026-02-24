/**
 * Page paywall : souscription B2B (1 company = 1 abonnement).
 * Route: /start
 * Plans: Starter · Pro (recommandé) · Elite
 * Toggle annuel / mensuel — même logique checkout que l'existant.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, Check, Gift, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// ─── Price IDs (ne pas modifier les IDs Pro existants) ───────────────────────
const PRICE_IDS = {
  starter: {
    annuel:  import.meta.env.VITE_STRIPE_PRICE_ID_STARTER_ANNUEL  || "",
    mensuel: import.meta.env.VITE_STRIPE_PRICE_ID_STARTER_MENSUEL || "",
  },
  pro: {
    annuel:  import.meta.env.VITE_STRIPE_PRICE_ID_ANNUEL  || "",
    mensuel: import.meta.env.VITE_STRIPE_PRICE_ID_MENSUEL || "",
  },
  elite: {
    annuel:  import.meta.env.VITE_STRIPE_PRICE_ID_ELITE_ANNUEL  || "",
    mensuel: import.meta.env.VITE_STRIPE_PRICE_ID_ELITE_MENSUEL || "",
  },
} as const;

type BillingInterval = "annuel" | "mensuel";
type PlanId = keyof typeof PRICE_IDS;

// ─── Données des plans ────────────────────────────────────────────────────────
interface BonusItem { label: string; value: string }

interface PlanDef {
  id: PlanId;
  name: string;
  recommended: boolean;
  priceAnnuel: number;   // €/mois affiché en mode annuel
  priceMensuel: number;  // €/mois affiché en mode mensuel
  annuelTotal: number;   // € facturés annuellement
  savingsAnnuel: number; // économie vs mensuel sur 12 mois
  trialDays: number;
  bonusItems: BonusItem[];
  bonusTotal: number;
  featurePrefix: string | null;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    recommended: false,
    priceAnnuel: 79,
    priceMensuel: 99,
    annuelTotal: 948,
    savingsAnnuel: 240,
    trialDays: 14,
    bonusItems: [
      { label: "Frais d'entrée",     value: "500 €"  },
      { label: "Onboarding vidéos",  value: "197 €"  },
      { label: "14j d'essai offert", value: "79 €"   },
    ],
    bonusTotal: 776,
    featurePrefix: null,
    features: [
      "Clients illimités",
      "Devis & factures PDF",
      "5 chantiers actifs",
      "Relances auto devis",
      "Dashboard CA mensuel",
      "Accès mobile PWA (iOS & Android)",
      "Support email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    recommended: true,
    priceAnnuel: 149,
    priceMensuel: 199,
    annuelTotal: 1788,
    savingsAnnuel: 600,
    trialDays: 14,
    bonusItems: [
      { label: "Frais d'entrée",          value: "1 000 €" },
      { label: "Démo Visio",              value: "297 €"   },
      { label: "Onboarding vidéos",       value: "197 €"   },
      { label: "Formation BTP Digital",   value: "397 €"   },
      { label: "14j d'essai offert",      value: "149 €"   },
    ],
    bonusTotal: 2040,
    featurePrefix: "Tout Starter, plus :",
    features: [
      "Chantiers illimités",
      "Planning équipe & affectation ouvriers",
      "Suivi dépenses par chantier (rentabilité temps réel)",
      "Devis assisté IA (description → devis en 2 min)",
      "Relances auto impayés",
      "Gestion documentaire (photos, bons, PV)",
      "Export comptable",
      "Support chat prioritaire",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    recommended: false,
    priceAnnuel: 229,
    priceMensuel: 299,
    annuelTotal: 2748,
    savingsAnnuel: 840,
    trialDays: 14,
    bonusItems: [
      { label: "Frais d'entrée",          value: "1 000 €" },
      { label: "Démo Visio",              value: "297 €"   },
      { label: "Onboarding expert 1h",    value: "497 €"   },
      { label: "Formation BTP Digital",   value: "397 €"   },
      { label: "Migration données",       value: "350 €"   },
      { label: "14j d'essai offert",      value: "229 €"   },
    ],
    bonusTotal: 2770,
    featurePrefix: "Tout Pro, plus :",
    features: [
      "IA avancée (alertes dérive chantier)",
      "CRM complet avec pipeline commercial",
      "Dashboard KPIs dirigeant (CA, marge, taux transformation)",
      "Multi-utilisateurs jusqu'à 10 comptes",
      "Intégration Pennylane, Sage, QuickBooks",
      "Rapports automatisés mensuels",
      "Support téléphonique dédié",
    ],
  },
];

// ─── Composant carte plan ─────────────────────────────────────────────────────
function PlanCard({
  plan,
  interval,
  onSubscribe,
  loading,
}: {
  plan: PlanDef;
  interval: BillingInterval;
  onSubscribe: (planId: PlanId) => void;
  loading: boolean;
}) {
  const currentPrice = interval === "annuel" ? plan.priceAnnuel : plan.priceMensuel;
  const priceId = PRICE_IDS[plan.id][interval];

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-visible transition-transform duration-200",
        plan.recommended
          ? "border-primary ring-2 ring-primary bg-primary/5 shadow-lg shadow-primary/20 scale-[1.03] z-10"
          : "border border-border bg-muted/60 hover:scale-[1.02]"
      )}
    >
      {/* Badge Recommandé */}
      {plan.recommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <Badge className="px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-md">
            ⭐ Recommandé
          </Badge>
        </div>
      )}

      <div className="pt-7 px-6 pb-3">
        {/* Nom du plan */}
        <p className={cn(
          "text-xs font-semibold uppercase tracking-widest mb-1",
          plan.recommended ? "text-primary" : "text-muted-foreground"
        )}>
          {plan.name}
        </p>

        {/* Prix */}
        <div className="flex items-end gap-1.5 mb-0.5">
          <span className={cn(
            "text-4xl font-bold tracking-tight",
            plan.recommended ? "text-primary" : "text-foreground"
          )}>
            {currentPrice} €
          </span>
          <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
        </div>

        {/* Sous-texte annuel */}
        {interval === "annuel" ? (
          <p className="text-xs text-muted-foreground">
            Facturé {plan.annuelTotal.toLocaleString("fr-FR")} €/an
            <span className="ml-1.5 text-green-600 font-medium">
              (économisez {plan.savingsAnnuel} €)
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Engagement 12 mois · Résiliation pendant l'essai uniquement
          </p>
        )}
      </div>

      <CardContent className="flex flex-col flex-1 px-6 pb-6 pt-3 space-y-4">

        {/* Boîte "Offert au démarrage" */}
        <div className={cn(
          "rounded-xl border p-3.5 space-y-2",
          plan.recommended
            ? "bg-green-500/10 border-green-500/30"
            : "bg-muted border-border"
        )}>
          <div className="flex items-center gap-1.5 mb-2">
            <Gift className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              Offert au démarrage
            </p>
          </div>
          {plan.bonusItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-green-500/70 shrink-0" />
                <span className="line-through opacity-60">{item.label}</span>
              </span>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
                {item.value} offert
              </span>
            </div>
          ))}
          <div className="border-t border-green-500/20 pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">
              Total offert
            </span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {plan.bonusTotal.toLocaleString("fr-FR")} €
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 flex-1">
          {plan.featurePrefix && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {plan.featurePrefix}
            </p>
          )}
          {plan.features.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className={cn(
                "w-4 h-4 shrink-0 mt-0.5",
                plan.recommended ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="text-sm text-foreground/80">{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-2 pt-2">
          <Button
            className="w-full h-11 text-sm font-semibold"
            variant={plan.recommended ? "default" : "outline"}
            disabled={loading || !priceId}
            onClick={() => onSubscribe(plan.id)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirection…
              </>
            ) : (
              "Démarrer mon essai 14j gratuit"
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Aucun paiement aujourd'hui · Résiliation pendant les 14j d'essai
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Start() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitation_id");
  const { toast } = useToast();
  const { user, loading: authLoading, currentCompanyId } = useAuth();
  const { isOwner } = usePermissions();
  const { isActive, isLoading: subLoading, subscription } = useSubscription();

  const [interval, setInterval] = useState<BillingInterval>("annuel");
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  // Non connecté → auth
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  // Déjà abonné → dashboard
  useEffect(() => {
    if (authLoading || subLoading || !user) return;
    if (isActive) navigate("/dashboard", { replace: true });
  }, [user, isActive, subLoading, authLoading, navigate]);

  // ─── Checkout — même logique que l'existant, étendue aux 3 plans ─────────
  const handleSubscribe = async (planId: PlanId) => {
    const priceId = PRICE_IDS[planId][interval];
    const plan = PLANS.find((p) => p.id === planId)!;

    if (!priceId && !invitationId) {
      toast({
        title: "Paiement non configuré",
        description:
          "Configurez VITE_STRIPE_PRICE_ID_STARTER_ANNUEL / _MENSUEL et VITE_STRIPE_PRICE_ID_ELITE_ANNUEL / _MENSUEL dans Vercel puis redéployez.",
        variant: "destructive",
      });
      return;
    }

    setCreatingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Session expirée", description: "Reconnectez-vous.", variant: "destructive" });
        return;
      }

      const body: Record<string, unknown> = {
        trial_period_days: plan.trialDays,
      };
      if (priceId) body.price_id = priceId;
      if (invitationId) body.invitation_id = invitationId;

      const { data, error } = await supabase.functions.invoke(
        "stripe-billing-create-checkout",
        { body, headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (error) {
        throw new Error((data as { error?: string })?.error || error.message || "Erreur serveur");
      }
      const url = data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error((data as { error?: string })?.error || "Aucune URL de paiement reçue");
    } catch (e: unknown) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur lors de l'ouverture du paiement",
        variant: "destructive",
      });
    } finally {
      setCreatingCheckout(false);
    }
  };

  // ─── Chargement ───────────────────────────────────────────────────────────
  if (authLoading || (user && subLoading && !subscription)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ─── Pas d'entreprise ─────────────────────────────────────────────────────
  if (!currentCompanyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Rejoignez une entreprise</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pour accéder à BTP Smart Pro, vous devez créer une entreprise ou accepter une invitation.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
              Aller à l'application
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Si vous avez reçu une invitation, utilisez le lien reçu par email.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Pas owner ────────────────────────────────────────────────────────────
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Souscription à BTP Smart Pro</h2>
              <p className="text-sm text-muted-foreground mt-1">
                L'abonnement est géré par le propriétaire de votre entreprise.
                Contactez-le pour souscrire ou obtenir un accès.
              </p>
            </div>
            <Button className="w-full" variant="outline" onClick={() => navigate("/dashboard", { replace: true })}>
              Retour à l'application
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Se déconnecter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Page de tarification principale ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Bannière engagement 12 mois ── */}
      <div className="bg-muted border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-snug">
            À l'issue de la période d'essai de 14 jours, votre abonnement est engagé pour 12 mois non
            résiliable avant échéance — quel que soit le mode de paiement choisi.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">

        {/* ── En-tête ── */}
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest">BTP SMART PRO</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Choisissez votre forfait
          </h1>
          <p className="text-muted-foreground">
            14 jours d'essai gratuit · Aucun paiement aujourd'hui · Support & accompagnement inclus
          </p>
        </div>

        {/* ── Toggle annuel / mensuel ── */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full border border-border bg-muted p-1 gap-1">
            <button
              onClick={() => setInterval("annuel")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                interval === "annuel"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annuel
              <span className="ml-1.5 text-xs text-green-600 font-semibold">
                (−20%)
              </span>
            </button>
            <button
              onClick={() => setInterval("mensuel")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                interval === "mensuel"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensuel
            </button>
          </div>
        </div>

        {/* ── Grille des 3 plans ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              interval={interval}
              onSubscribe={handleSubscribe}
              loading={creatingCheckout}
            />
          ))}
        </div>

        {/* ── Footer légal ── */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          Engagement 12 mois · Résiliation possible pendant les 14 jours d'essai
        </p>

      </div>
    </div>
  );
}
