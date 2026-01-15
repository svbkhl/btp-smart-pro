/**
 * Hook pour gérer la bibliothèque de lignes réutilisables
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

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

  return useQuery({
    queryKey: ["quote_line_library", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
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
    enabled: !!user,
  });
};

/**
 * Recherche dans la bibliothèque (autocomplete)
 */
export const useSearchQuoteLineLibrary = (searchQuery: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quote_line_library_search", user?.id, searchQuery],
    queryFn: async () => {
      if (!user || !searchQuery.trim()) return [];

      const companyId = await getCurrentCompanyId(user.id);
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

      if (error) throw error;
      return (data || []) as QuoteLineLibraryItem[];
    },
    enabled: !!user && searchQuery.trim().length > 0,
  });
};

/**
 * Ajoute ou met à jour une ligne dans la bibliothèque (upsert)
 */
export const useUpsertQuoteLineLibrary = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: CreateLibraryItemData) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const labelNormalized = normalizeLabel(itemData.label);

      // Vérifier si existe déjà
      const { data: existing } = await supabase
        .from("quote_line_library")
        .select("*")
        .eq("company_id", companyId)
        .eq("label_normalized", labelNormalized)
        .maybeSingle();

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

        if (error) throw error;
        return data as QuoteLineLibraryItem;
      } else {
        // Créer nouveau
        const { data, error } = await supabase
          .from("quote_line_library")
          .insert({
            company_id: companyId,
            label: itemData.label,
            label_normalized: labelNormalized,
            default_unit: itemData.default_unit,
            default_unit_price_ht: itemData.default_unit_price_ht,
            default_category: itemData.default_category,
            times_used: 1,
            last_used_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
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
