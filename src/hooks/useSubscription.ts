/**
 * Hook: useSubscription
 * Données d'abonnement B2B de l'entreprise courante (1 company = 1 Stripe Customer = 1 Subscription).
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | null;

export interface SubscriptionData {
  subscription_status: SubscriptionStatus;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  stripe_customer_id: string | null;
  stripe_onboarding_required: boolean;
  stripe_price_id: string | null;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ["trialing", "active"];

/** Entreprises qui ont accès sans abonnement (ex: partenaires). Match par inclusion (ex: "First Payout SARL" → ok) */
const SUBSCRIPTION_BYPASS_PATTERNS = ["first payout"];

function isBypassCompany(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const n = name.trim().toLowerCase();
  return SUBSCRIPTION_BYPASS_PATTERNS.some((p) => n.includes(p));
}

export function useSubscription() {
  const { user, currentCompanyId } = useAuth();

  const query = useQuery({
    queryKey: ["company-subscription", currentCompanyId],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!currentCompanyId) return null;
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("subscription_status, trial_end, current_period_end, cancel_at_period_end, cancel_at, stripe_customer_id, stripe_onboarding_required, stripe_price_id, name")
          .eq("id", currentCompanyId)
          .single();
        if (error || !data) {
          const needsFallback = error && (error?.message?.includes("stripe_onboarding_required") || error?.message?.includes("stripe_price_id") || error?.message?.includes("cancel_at") || error?.code === "42703");
          if (needsFallback) {
            const { data: fallback, error: fallbackErr } = await supabase
              .from("companies")
              .select("subscription_status, trial_end, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_price_id, name")
              .eq("id", currentCompanyId)
              .single();
            if (fallbackErr || !fallback) return null;
            const result = {
              subscription_status: (fallback.subscription_status as SubscriptionStatus) ?? null,
              trial_end: fallback.trial_end ?? null,
              current_period_end: fallback.current_period_end ?? null,
              cancel_at_period_end: Boolean(fallback.cancel_at_period_end),
              cancel_at: null,
              stripe_customer_id: fallback.stripe_customer_id ?? null,
              stripe_onboarding_required: false,
              stripe_price_id: (fallback as { stripe_price_id?: string | null }).stripe_price_id ?? null,
              name: (fallback as { name?: string | null }).name ?? null,
            };
            return result;
          }
          return null;
        }
        return {
          subscription_status: (data.subscription_status as SubscriptionStatus) ?? null,
          trial_end: data.trial_end ?? null,
          current_period_end: data.current_period_end ?? null,
          cancel_at_period_end: Boolean(data.cancel_at_period_end),
          cancel_at: (data as { cancel_at?: string | null }).cancel_at ?? null,
          stripe_customer_id: data.stripe_customer_id ?? null,
          stripe_onboarding_required: data.stripe_onboarding_required === true,
          stripe_price_id: (data as { stripe_price_id?: string | null }).stripe_price_id ?? null,
          name: (data as { name?: string | null }).name ?? null,
        };
      } catch {
        return null;
      }
    },
    enabled: !!user && !!currentCompanyId,
    staleTime: 60 * 1000,
  });

  const data = query.data ?? null;
  const companyName = data && "name" in data ? (data as { name?: string | null }).name : null;
  const bypassSubscription = isBypassCompany(companyName);
  // Strict : accès si abonnement actif (trialing ou active) OU si entreprise partenaire (ex: first payout)
  const isActive =
    bypassSubscription ||
    (data != null && data.subscription_status != null && ACTIVE_STATUSES.includes(data.subscription_status));

  return {
    ...query,
    subscription: data,
    isActive,
    isLoading: query.isLoading,
    error: query.error,
  };
}
