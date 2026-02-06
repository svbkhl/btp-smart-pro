/**
 * Plans d'abonnement – texte officiel SMART PRO.
 * Source : VITE_STRIPE_PLANS (JSON) ou VITE_STRIPE_PRICE_ID_ANNUEL / MENSUEL.
 */

export interface StripePlanOption {
  label: string;
  price_id: string;
  trial_days: number;
  price_display?: string;
  price_subline?: string;
  recommended?: boolean;
  badge?: string;
  features?: string[];
  notes?: string[];
}

const ENV = import.meta.env;
const PRICE_ANNUEL = ENV.VITE_STRIPE_PRICE_ID_ANNUEL || "";
const PRICE_MENSUEL = ENV.VITE_STRIPE_PRICE_ID_MENSUEL || "";
const DEFAULT_PRICE_ID = ENV.VITE_STRIPE_PRICE_ID || "";

/** Plans officiels SMART PRO (texte de la page pricing). Toujours 2 offres si au moins un price_id est configuré. */
function buildOfficialPlans(): StripePlanOption[] {
  const plans: StripePlanOption[] = [];
  const priceAnnuel = PRICE_ANNUEL || (PRICE_MENSUEL ? "" : DEFAULT_PRICE_ID);
  const priceMensuel = PRICE_MENSUEL || (PRICE_ANNUEL ? "" : DEFAULT_PRICE_ID);
  const hasAny = priceAnnuel || priceMensuel;
  if (priceAnnuel) {
    plans.push({
      label: "SMART PRO – ANNUEL",
      price_id: priceAnnuel,
      trial_days: 30,
      price_display: "1 788 € / an",
      price_subline: "149 € / mois",
      recommended: true,
      badge: "Économisez 600 €",
      features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
    });
  }
  if (priceMensuel) {
    plans.push({
      label: "SMART PRO – MENSUEL",
      price_id: priceMensuel,
      trial_days: 30,
      price_display: "199 € / mois",
      recommended: false,
      features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
    });
  }
  // Si un seul price ID est défini (ANNUEL ou MENSUEL), afficher quand même les 2 cartes (2e avec le même price_id)
  if (hasAny && plans.length === 1) {
    const singlePriceId = plans[0].price_id;
    if (plans[0].label.includes("ANNUEL")) {
      plans.push({
        label: "SMART PRO – MENSUEL",
        price_id: singlePriceId,
        trial_days: 30,
        price_display: "199 € / mois",
        recommended: false,
        features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
      });
    } else {
      plans.unshift({
        label: "SMART PRO – ANNUEL",
        price_id: singlePriceId,
        trial_days: 30,
        price_display: "1 788 € / an",
        price_subline: "149 € / mois",
        recommended: true,
        badge: "Économisez 600 €",
        features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
      });
    }
  }
  return plans;
}

function parsePlansFromEnv(): StripePlanOption[] {
  const raw = ENV.VITE_STRIPE_PLANS;
  if (raw && typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(
            (p: unknown): p is StripePlanOption =>
              typeof p === "object" &&
              p !== null &&
              typeof (p as StripePlanOption).label === "string" &&
              typeof (p as StripePlanOption).price_id === "string" &&
              typeof (p as StripePlanOption).trial_days === "number"
          )
          .map((p) => ({
            label: p.label,
            price_id: p.price_id,
            trial_days: p.trial_days,
            price_display: p.price_display,
            price_subline: p.price_subline,
            recommended: p.recommended,
            badge: p.badge,
            features: p.features ?? ["1 mois d'essai offert", "Aucun paiement aujourd'hui"],
            notes: p.notes,
          }));
      }
    } catch {
      /* fallback */
    }
  }
  const official = buildOfficialPlans();
  if (official.length > 0) return official;
  // Un seul price ID configuré (ex. VITE_STRIPE_PRICE_ID) : afficher quand même les 2 offres (Annuel + Mensuel)
  if (DEFAULT_PRICE_ID) {
    return [
      {
        label: "SMART PRO – ANNUEL",
        price_id: DEFAULT_PRICE_ID,
        trial_days: 30,
        price_display: "1 788 € / an",
        price_subline: "149 € / mois",
        recommended: true,
        badge: "Économisez 600 €",
        features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
      },
      {
        label: "SMART PRO – MENSUEL",
        price_id: DEFAULT_PRICE_ID,
        trial_days: 30,
        price_display: "199 € / mois",
        recommended: false,
        features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
      },
    ];
  }
  // Aucune config : afficher quand même les 2 cartes (après invitation, etc.). Clic → toast "Configuration manquante".
  return [
    {
      label: "SMART PRO – ANNUEL",
      price_id: "",
      trial_days: 30,
      price_display: "1 788 € / an",
      price_subline: "149 € / mois",
      recommended: true,
      badge: "Économisez 600 €",
      features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
    },
    {
      label: "SMART PRO – MENSUEL",
      price_id: "",
      trial_days: 30,
      price_display: "199 € / mois",
      recommended: false,
      features: ["Frais d'entrée 1000€ offert", "1 mois d'essai offert", "Aucun paiement aujourd'hui"],
    },
  ];
}

let cached: StripePlanOption[] | null = null;

export function getStripePlanOptions(): StripePlanOption[] {
  if (cached === null) cached = parsePlansFromEnv();
  return cached;
}
