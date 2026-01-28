/**
 * Hook pour gérer les préférences de l'entreprise (TVA, mode devis)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";

export interface CompanySettings {
  company_id: string;
  default_tva_rate: number; // Renommé depuis default_quote_tva_rate
  default_quote_tva_rate?: number; // Ancien nom (compatibilité)
  default_quote_mode: "simple" | "detailed";
  default_tva_293b: boolean; // TVA non applicable 293B
  updated_at: string;
  created_at: string;
}

export interface UpdateCompanySettingsData {
  default_tva_rate?: number;
  default_quote_tva_rate?: number; // Ancien nom (compatibilité)
  default_quote_mode?: "simple" | "detailed";
  default_tva_293b?: boolean;
}

/**
 * Récupère les préférences de l'entreprise
 */
export const useCompanySettings = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["company_settings", companyId],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
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

      // Gérer silencieusement les erreurs 404 (table n'existe pas)
      if (error && error.code !== "PGRST116") {
        if (error.code === "PGRST204" || error.message?.includes("Could not find") || error.message?.includes("404")) {
          // Table n'existe pas, retourner valeurs par défaut
          return {
            company_id: companyId,
            default_tva_rate: 0.20,
            default_quote_tva_rate: 0.20,
            default_quote_mode: "simple" as const,
            default_tva_293b: false,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
        }
        throw error;
      }

      // Si pas de settings, retourner valeurs par défaut
      if (!data) {
        return {
          company_id: companyId,
          default_tva_rate: 0.20,
          default_quote_tva_rate: 0.20, // Compatibilité
          default_quote_mode: "simple" as const,
          default_tva_293b: false,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      }

      // Normaliser les données (gérer ancien nom default_quote_tva_rate)
      const normalizedData = {
        ...data,
        default_tva_rate: data.default_tva_rate ?? data.default_quote_tva_rate ?? 0.20,
        default_quote_tva_rate: data.default_tva_rate ?? data.default_quote_tva_rate ?? 0.20,
        default_tva_293b: data.default_tva_293b ?? false,
      };

      return normalizedData as CompanySettings;
    },
    enabled: !!user && !isLoadingCompanyId,
  });
};

/**
 * Met à jour les préférences de l'entreprise
 */
export const useUpdateCompanySettings = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: UpdateCompanySettingsData) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      // Normaliser les données (gérer ancien nom default_quote_tva_rate)
      const normalizedData: any = {
        company_id: companyId,
        updated_at: new Date().toISOString(),
      };

      if (settingsData.default_tva_rate !== undefined) {
        normalizedData.default_tva_rate = settingsData.default_tva_rate;
      } else if (settingsData.default_quote_tva_rate !== undefined) {
        normalizedData.default_tva_rate = settingsData.default_quote_tva_rate;
      }

      if (settingsData.default_quote_mode !== undefined) {
        normalizedData.default_quote_mode = settingsData.default_quote_mode;
      }

      if (settingsData.default_tva_293b !== undefined) {
        normalizedData.default_tva_293b = settingsData.default_tva_293b;
      }

      // Upsert (créer si n'existe pas, mettre à jour sinon)
      const { data, error } = await supabase
        .from("company_settings")
        .upsert(normalizedData, {
          onConflict: "company_id",
        })
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
