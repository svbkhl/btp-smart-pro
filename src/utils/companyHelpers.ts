/**
 * Helpers pour récupérer company_id de l'utilisateur
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère le company_id de l'utilisateur actuel
 * Retourne le premier company_id actif de l'utilisateur
 */
export async function getCurrentCompanyId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching company_id:", error);
      return null;
    }

    return data?.company_id || null;
  } catch (error) {
    console.error("Error in getCurrentCompanyId:", error);
    return null;
  }
}
