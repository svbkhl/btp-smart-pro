/**
 * Hook : nom d'affichage de l'utilisateur connecté
 * Utilise l'RPC get_current_user_display_name (SECURITY DEFINER) qui priorise
 * la table employees (prenom, nom) sur user_metadata, et bypass RLS pour
 * éviter les incohérences (ex: "Henry" au lieu de "Islam Slimani").
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";

export function useCurrentUserDisplayName() {
  const { user } = useAuth();
  const { companyId } = useCompanyId();

  const { data: rpcData } = useQuery({
    queryKey: ["current-user-display-name", user?.id, companyId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc("get_current_user_display_name", {
        p_company_id: companyId || null,
      });
      if (error || !data || data.length === 0) return null;
      const row = data[0] as { first_name: string; last_name: string; full_name: string };
      return row;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (rpcData?.full_name || rpcData?.first_name || rpcData?.last_name) {
    const firstName = (rpcData.first_name || "").trim();
    const lastName = (rpcData.last_name || "").trim();
    const fullName = (rpcData.full_name || `${firstName} ${lastName}`.trim()).trim();
    return {
      firstName: firstName || fullName,
      lastName,
      fullName: fullName || user?.email || "",
    };
  }

  // Fallback local si RPC indisponible (user_metadata)
  const firstName =
    (user as any)?.user_metadata?.first_name ||
    (user as any)?.user_metadata?.prenom ||
    (user as any)?.raw_user_meta_data?.first_name ||
    (user as any)?.raw_user_meta_data?.prenom ||
    "";
  const lastName =
    (user as any)?.user_metadata?.last_name ||
    (user as any)?.user_metadata?.nom ||
    (user as any)?.raw_user_meta_data?.last_name ||
    (user as any)?.raw_user_meta_data?.nom ||
    "";
  const fullName = `${firstName} ${lastName}`.trim() || user?.email || "";

  return {
    firstName,
    lastName,
    fullName,
  };
}
