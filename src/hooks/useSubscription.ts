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
  stripe_customer_id: string | null;
  stripe_onboarding_required: boolean;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ["trialing", "active"];

export function useSubscription() {
  const { user, currentCompanyId } = useAuth();

  const query = useQuery({
    queryKey: ["company-subscription", currentCompanyId],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!currentCompanyId) return null;
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("subscription_status, trial_end, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_onboarding_required")
          .eq("id", currentCompanyId)
          .single();
        if (error || !data) {
          const needsFallback = error && (error?.message?.includes("stripe_onboarding_required") || error?.code === "42703");
          if (needsFallback) {
            const { data: fallback, error: fallbackErr } = await supabase
              .from("companies")
              .select("subscription_status, trial_end, current_period_end, cancel_at_period_end, stripe_customer_id")
              .eq("id", currentCompanyId)
              .single();
            if (fallbackErr || !fallback) return null;
            return {
              subscription_status: (fallback.subscription_status as SubscriptionStatus) ?? null,
              trial_end: fallback.trial_end ?? null,
              current_period_end: fallback.current_period_end ?? null,
              cancel_at_period_end: Boolean(fallback.cancel_at_period_end),
              stripe_customer_id: fallback.stripe_customer_id ?? null,
              stripe_onboarding_required: false,
            };
          }
          return null;
        }
        return {
          subscription_status: (data.subscription_status as SubscriptionStatus) ?? null,
          trial_end: data.trial_end ?? null,
          current_period_end: data.current_period_end ?? null,
          cancel_at_period_end: Boolean(data.cancel_at_period_end),
          stripe_customer_id: data.stripe_customer_id ?? null,
          stripe_onboarding_required: data.stripe_onboarding_required === true,
        };
      } catch {
        return null;
      }
    },
    enabled: !!user && !!currentCompanyId,
    staleTime: 60 * 1000,
  });

  const data = query.data ?? null;
  // Strict : accès uniquement si abonnement actif (trialing ou active). Pas d'accès sans souscription.
  const isActive =
    data != null && data.subscription_status != null && ACTIVE_STATUSES.includes(data.subscription_status);

  return {
    ...query,
    subscription: data,
    isActive,
    isLoading: query.isLoading,
    error: query.error,
  };
}
