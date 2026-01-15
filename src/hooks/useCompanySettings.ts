/**
 * Hook pour gérer les préférences de l'entreprise (TVA, mode devis)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

export interface CompanySettings {
  company_id: string;
  default_quote_tva_rate: number;
  default_quote_mode: "simple" | "detailed";
  updated_at: string;
  created_at: string;
}

export interface UpdateCompanySettingsData {
  default_quote_tva_rate?: number;
  default_quote_mode?: "simple" | "detailed";
}

/**
 * Récupère les préférences de l'entreprise
 */
export const useCompanySettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["company_settings", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        // Retourner valeurs par défaut si pas de company
        return {
          company_id: "",
          default_quote_tva_rate: 0.20,
          default_quote_mode: "simple" as const,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Si pas de settings, retourner valeurs par défaut
      if (!data) {
        return {
          company_id: companyId,
          default_quote_tva_rate: 0.20,
          default_quote_mode: "simple" as const,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      }

      return data as CompanySettings;
    },
    enabled: !!user,
  });
};

/**
 * Met à jour les préférences de l'entreprise
 */
export const useUpdateCompanySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: UpdateCompanySettingsData) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      // Upsert (créer si n'existe pas, mettre à jour sinon)
      const { data, error } = await supabase
        .from("company_settings")
        .upsert(
          {
            company_id: companyId,
            ...settingsData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "company_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as CompanySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
    },
  });
};
