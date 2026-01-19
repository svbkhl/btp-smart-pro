/**
 * Helpers pour récupérer company_id de l'utilisateur
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère le company_id de l'utilisateur actuel
 * Retourne le premier company_id actif de l'utilisateur
 * Gère le cas où la colonne status n'existe pas dans company_users
 */
export async function getCurrentCompanyId(userId: string): Promise<string | null> {
  try {
    // Essayer d'abord avec status (si la colonne existe)
    let query = supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId);

    const { data, error } = await query.eq("status", "active").limit(1).maybeSingle();

    // Si erreur car status n'existe pas, réessayer sans status
    if (error && (error.code === "42703" || error.message?.includes('column "status" does not exist'))) {
      const { data: dataNoStatus, error: errorNoStatus } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (errorNoStatus) {
        console.error("Error fetching company_id:", errorNoStatus);
        return null;
      }

      return dataNoStatus?.company_id || null;
    }

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
