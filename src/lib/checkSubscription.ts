/**
 * Vérifie si l'utilisateur a un abonnement actif (trialing ou active).
 * Utilisé après auth pour rediriger vers /start si pas de forfait.
 * Exception : employés de "first payout" ont accès sans abonnement.
 */

import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["trialing", "active"];
const BYPASS_PATTERNS = ["first payout"];

function isBypassCompany(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const n = name.trim().toLowerCase();
  return BYPASS_PATTERNS.some((p) => n.includes(p));
}

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
      .select("subscription_status, name")
      .eq("id", cu.company_id)
      .single();

    if (cError || !company) return false;
    if (isBypassCompany(company.name)) return true;
    if (!company.subscription_status) return false;
    return ACTIVE_STATUSES.includes(company.subscription_status);
  } catch {
    return false;
  }
}
