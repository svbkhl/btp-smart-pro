/**
 * Hook pour gérer la bibliothèque de lignes réutilisables
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";

export interface QuoteLineLibraryItem {
  id: string;
  company_id: string;
  label: string;
  label_normalized: string;
  default_unit?: string | null;
  default_unit_price_ht?: number | null;
  default_category?: "labor" | "material" | "service" | "other" | null;
  times_used: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLibraryItemData {
  label: string;
  default_unit?: string;
  default_unit_price_ht?: number;
  default_category?: "labor" | "material" | "service" | "other";
}

/**
 * Normalise un label pour déduplication
 */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Récupère toutes les lignes de la bibliothèque de l'entreprise
 */
export const useQuoteLineLibrary = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote_line_library", companyId],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        return [];
      }

      const { data, error } = await supabase
        .from("quote_line_library")
        .select("*")
        .eq("company_id", companyId)
        .order("times_used", { ascending: false })
        .order("last_used_at", { ascending: false, nullsLast: true });

      if (error) throw error;
      return (data || []) as QuoteLineLibraryItem[];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
  });
};

/**
 * Recherche dans la bibliothèque (autocomplete)
 */
export const useSearchQuoteLineLibrary = (searchQuery: string) => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote_line_library_search", companyId, searchQuery],
    queryFn: async () => {
      if (!user || !searchQuery.trim()) return [];
      if (!companyId) {
        return [];
      }

      const normalizedQuery = normalizeLabel(searchQuery);

      const { data, error } = await supabase
        .from("quote_line_library")
        .select("*")
        .eq("company_id", companyId)
        .ilike("label_normalized", `%${normalizedQuery}%`)
        .order("times_used", { ascending: false })
        .limit(10);

      // Gérer silencieusement les erreurs 404 (table n'existe pas)
      if (error) {
        if (error.code === "PGRST204" || error.message?.includes("Could not find") || error.message?.includes("404")) {
          return []; // Retourner un tableau vide si la table n'existe pas
        }
        throw error;
      }
      return (data || []) as QuoteLineLibraryItem[];
    },
    enabled: !!user && searchQuery.trim().length > 0 && !isLoadingCompanyId && !!companyId,
  });
};

/**
 * Ajoute ou met à jour une ligne dans la bibliothèque (upsert)
 */
export const useUpsertQuoteLineLibrary = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: CreateLibraryItemData) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const labelNormalized = normalizeLabel(itemData.label);
      const unit = itemData.default_unit || null;

      // Vérifier si existe déjà (avec unit dans UNIQUE)
      const { data: existing, error: checkError } = await supabase
        .from("quote_line_library")
        .select("*")
        .eq("company_id", companyId)
        .eq("label_normalized", labelNormalized)
        .eq("default_unit", unit)
        .maybeSingle();

      // Gérer silencieusement les erreurs 404 (table n'existe pas)
      if (checkError && (checkError.code === "PGRST204" || checkError.message?.includes("Could not find") || checkError.message?.includes("404"))) {
        // Table n'existe pas, retourner un objet factice
        return {
          id: "",
          company_id: companyId,
          label: itemData.label,
          label_normalized: labelNormalized,
          default_unit: itemData.default_unit || null,
          default_unit_price_ht: itemData.default_unit_price_ht || null,
          default_category: itemData.default_category || null,
          times_used: 0,
          last_used_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as QuoteLineLibraryItem;
      }

      if (existing) {
        // Mettre à jour (incrémenter times_used, mettre à jour last_used_at et autres champs)
        const { data, error } = await supabase
          .from("quote_line_library")
          .update({
            default_unit: itemData.default_unit ?? existing.default_unit,
            default_unit_price_ht: itemData.default_unit_price_ht ?? existing.default_unit_price_ht,
            default_category: itemData.default_category ?? existing.default_category,
            times_used: (existing.times_used || 0) + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          // Gérer silencieusement les erreurs 404
          if (error.code === "PGRST204" || error.message?.includes("Could not find") || error.message?.includes("404")) {
            return existing;
          }
          throw error;
        }
        return data as QuoteLineLibraryItem;
      } else {
        // Créer nouveau
        const { data, error } = await supabase
          .from("quote_line_library")
          .insert({
            company_id: companyId,
            label: itemData.label,
            label_normalized: labelNormalized,
            default_unit: unit, // Obligatoire
            default_unit_price_ht: itemData.default_unit_price_ht,
            default_category: itemData.default_category,
            times_used: 1,
            last_used_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          // Gérer silencieusement les erreurs 404
          if (error.code === "PGRST204" || error.message?.includes("Could not find") || error.message?.includes("404")) {
            // Retourner un objet factice si la table n'existe pas
            return {
              id: "",
              company_id: companyId,
              label: itemData.label,
              label_normalized: labelNormalized,
              default_unit: itemData.default_unit || null,
              default_unit_price_ht: itemData.default_unit_price_ht || null,
              default_category: itemData.default_category || null,
              times_used: 1,
              last_used_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as QuoteLineLibraryItem;
          }
          throw error;
        }
        return data as QuoteLineLibraryItem;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote_line_library"] });
    },
  });
};

/**
 * Supprime une ligne de la bibliothèque
 */
export const useDeleteQuoteLineLibrary = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const { error } = await supabase
        .from("quote_line_library")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote_line_library"] });
    },
  });
};
