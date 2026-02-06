/**
 * Page paywall : souscription B2B (1 company = 1 abonnement).
 * Route: /start
 * - Pas d'entreprise → inviter à créer/rejoindre une entreprise
 * - Pas owner → inviter à contacter le propriétaire
 * - Owner sans abonnement actif → CTA vers Stripe Checkout
 * - Déjà abonné → redirection vers dashboard
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, CreditCard, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getStripePlanOptions, type StripePlanOption } from "@/config/stripePlans";

const DEFAULT_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || "";

export default function Start() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitation_id");
  const { toast } = useToast();
  const { user, loading: authLoading, currentCompanyId } = useAuth();
  const { isOwner } = usePermissions();
  const { subscription, isActive, isLoading: subLoading } = useSubscription();
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const planOptions = getStripePlanOptions();

  // Non connecté → auth
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Déjà abonnement actif (et a une company) → dashboard
  useEffect(() => {
    if (authLoading || subLoading || !user) return;
    if (currentCompanyId && isActive) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, currentCompanyId, isActive, subLoading, authLoading, navigate]);

  const handleStartSubscription = async (plan?: StripePlanOption) => {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "Start.tsx:handleStartSubscription:entry",
        message: "click Demarrer",
        data: { planLabel: plan?.label, hasInvitationId: !!invitationId },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    const selectedPlan = plan ?? (planOptions.length > 0 ? planOptions[0] : null);
    const body: { price_id?: string; invitation_id?: string; trial_period_days?: number } = {};
    if (invitationId) body.invitation_id = invitationId;
    if (selectedPlan) {
      body.price_id = selectedPlan.price_id?.trim() || undefined;
      body.trial_period_days = selectedPlan.trial_days;
    } else if (DEFAULT_PRICE_ID) {
      body.price_id = DEFAULT_PRICE_ID;
      body.trial_period_days = 14;
    }
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "Start.tsx:beforeCheck",
        message: "body before guard",
        data: { hasPriceId: !!body.price_id, hasInvitationId: !!body.invitation_id },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
      if (!body.price_id && !body.invitation_id) {
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "Start.tsx:skipNoPrice",
          message: "early return no price_id",
          data: {},
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "A",
        }),
      }).catch(() => {});
      // #endregion
      toast({
        title: "Paiement non configuré",
        description:
          "Configurez les variables d'environnement Stripe dans Vercel (VITE_STRIPE_PRICE_ID_ANNUEL et VITE_STRIPE_PRICE_ID_MENSUEL) puis redéployez. [diagnostic: price_id manquant]",
        variant: "destructive",
      });
      return;
    }
    setCreatingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "Start.tsx:afterGetSession",
          message: "session check",
          data: { hasSession: !!session, hasToken: !!session?.access_token },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "B",
        }),
      }).catch(() => {});
      // #endregion
      if (!session?.access_token) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter puis réessayer.",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke("stripe-billing-create-checkout", {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "Start.tsx:afterInvoke",
          message: "invoke result",
          data: {
            hasError: !!error,
            errorMsg: error?.message ?? null,
            dataError: (data as { error?: string })?.error ?? null,
            hasUrl: !!(data?.url),
            urlPrefix: data?.url ? String(data.url).slice(0, 40) : null,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "C,E",
        }),
      }).catch(() => {});
      // #endregion
      if (error) {
        const errMsg = (data as { error?: string })?.error || error.message || "Erreur serveur";
        throw new Error(errMsg);
      }
      const url = data?.url;
      if (url) {
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "Start.tsx:beforeRedirect",
            message: "redirect via form submit (Safari)",
            data: { urlLen: url.length },
            timestamp: Date.now(),
            sessionId: "debug-session",
            hypothesisId: "D",
            runId: "post-fix",
          }),
        }).catch(() => {});
        // #endregion
        setCheckoutUrl(url);
        setCreatingCheckout(false);
        // Safari bloque souvent la redirection après async. On tente formulaire + replace, et on affiche un lien de secours (clic = geste utilisateur).
        const form = document.createElement("form");
        form.method = "GET";
        form.action = url;
        form.style.display = "none";
        document.body.appendChild(form);
        form.submit();
        setTimeout(() => {
          window.location.replace(url);
        }, 150);
        return;
      }
      throw new Error((data as { error?: string })?.error || "Aucune URL de paiement reçue");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors de l'ouverture du paiement";
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "Start.tsx:catch",
          message: "catch",
          data: { message },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "C,D,E",
        }),
      }).catch(() => {});
      // #endregion
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setCreatingCheckout(false);
    }
  };

  if (authLoading || (user && subLoading && !subscription)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Pas d'entreprise
  if (!currentCompanyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Rejoignez une entreprise</CardTitle>
            <CardDescription>
              Pour accéder à BTP Smart Pro, vous devez créer une entreprise ou accepter une invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() => navigate("/dashboard", { replace: true })}
            >
              Aller à l'application
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Si vous avez reçu une invitation, utilisez le lien reçu par email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pas owner : demander au propriétaire de souscrire
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Abonnement requis</CardTitle>
            <CardDescription>
              L'accès à l'application nécessite un abonnement actif. Contactez le propriétaire de votre espace pour souscrire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Owner sans abonnement actif : forfaits épurés premium
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 pt-4">
      <div className="w-full max-w-4xl space-y-6">
        {checkoutUrl && (
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-center max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground mb-2">
              Si la page de paiement ne s&apos;ouvre pas, cliquez sur le lien ci-dessous (notamment sur Safari) :
            </p>
            <a
              href={checkoutUrl}
              target="_self"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              Accéder à la page de paiement Stripe
            </a>
          </div>
        )}
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-primary uppercase tracking-wide">BTP SMART PRO</p>
          <p className="text-lg text-muted-foreground font-medium">
            L&apos;outil tout-en-un pour les pros du BTP.
          </p>
          <h1 className="text-2xl font-bold pt-1">Choisissez votre forfait</h1>
          <p className="text-sm text-muted-foreground/90">
            Conçu pour artisans, PME et indépendants du BTP
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 max-w-2xl mx-auto">
          <Checkbox
            id="terms-engagement"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
          />
          <Label
            htmlFor="terms-engagement"
            className="text-sm font-medium leading-relaxed cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Je reconnais qu&apos;à l&apos;issue de la période d&apos;essai, mon abonnement est engagé pour 12 mois et non résiliable avant échéance.
          </Label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 items-stretch">
          {planOptions.map((plan, index) => (
            <Card
              key={plan.price_id || plan.label + index}
              className={`relative overflow-visible flex flex-col transition-transform duration-200 hover:scale-105 ${
                plan.recommended
                  ? "border-primary bg-primary/5"
                  : "border border-border bg-muted/60"
              }`}
            >
              {plan.recommended && (
                <span className="absolute top-4 right-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recommandé
                </span>
              )}
              <CardHeader className="pb-2 pt-6 px-6 min-h-[140px]">
                <CardTitle className="text-lg font-semibold">{plan.label}</CardTitle>
                {plan.price_display && (
                  <div>
                    <p className="text-2xl font-semibold text-primary">{plan.price_display}</p>
                    {plan.price_subline ? (
                      <p className="text-base text-muted-foreground">({plan.price_subline})</p>
                    ) : (
                      <div className="h-6" aria-hidden />
                    )}
                  </div>
                )}
                <div className="min-h-[1.25rem]">
                  {plan.badge && <p className="text-sm font-medium text-primary">{plan.badge}</p>}
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6 pt-3 flex-1 flex flex-col">
                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 text-base">
                    {plan.features.map((f, i) => {
                      const fraisEntree = f.startsWith("Frais d'entrée");
                      if (fraisEntree) {
                        return (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-green-600">•</span>
                            <span className="text-muted-foreground">
                              <span className="line-through">Frais d&apos;entrée 1000€</span>{" "}
                              <span className="text-green-600">offert</span>
                            </span>
                          </li>
                        );
                      }
                      const highlight = f.includes("essai");
                      return (
                        <li key={i} className="flex items-center gap-2">
                          <span className={highlight ? "text-green-600" : ""}>•</span>
                          <span className={highlight ? "text-green-600" : "text-muted-foreground"}>{f}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-auto space-y-2">
                  <Button
                    className="w-full h-11 text-base"
                    variant={plan.recommended ? "default" : "outline"}
                    disabled={creatingCheckout || !acceptedTerms}
                    onClick={() => handleStartSubscription(plan)}
                  >
                    {creatingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirection...
                      </>
                    ) : (
                      "Démarrer mon essai gratuit"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Résiliation possible pendant l&apos;essai
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
