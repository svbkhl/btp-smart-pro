/**
 * Vérifie si l'utilisateur a un abonnement actif (trialing ou active).
 * Utilisé après auth pour rediriger vers /start si pas de forfait.
 */

import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["trialing", "active"];

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const { data: cu, error: cuError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cuError || !cu?.company_id) return false;

    const { data: company, error: cError } = await supabase
      .from("companies")
      .select("subscription_status")
      .eq("id", cu.company_id)
      .single();

    if (cError || !company?.subscription_status) return false;
    return ACTIVE_STATUSES.includes(company.subscription_status);
  } catch {
    return false;
  }
}
