/**
 * Vérifie si l'utilisateur peut accéder à l'app avec son entreprise.
 * Abonnement Stripe optionnel : essai / facturation manuelle → subscription_status souvent null ou trialing.
 */

import { supabase } from "@/integrations/supabase/client";

/** Accès refusé uniquement pour ces statuts (résiliation / impayé côté Stripe). */
const BLOCKED_STATUSES = ["canceled", "unpaid"];
const BYPASS_PATTERNS = ["first payout"];
const BYPASS_EMAILS = ["khalfallahs.ndrc@gmail.com"];

function isBypassCompany(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const n = name.trim().toLowerCase();
  return BYPASS_PATTERNS.some((p) => n.includes(p));
}

function isBypassEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  return BYPASS_EMAILS.includes(email.trim().toLowerCase());
}

export async function hasActiveSubscription(
  userId: string,
  userEmail?: string | null
): Promise<boolean> {
  if (isBypassEmail(userEmail)) return true;
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
    const st = company.subscription_status;
    if (st == null) return true;
    if (BLOCKED_STATUSES.includes(st)) return false;
    return true;
  } catch {
    return false;
  }
}
