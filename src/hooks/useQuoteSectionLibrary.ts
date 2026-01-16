/**
 * Hook pour gérer la bibliothèque de sections réutilisables
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

export interface QuoteSectionLibraryItem {
  id: string;
  company_id: string;
  title: string;
  title_normalized: string;
  times_used: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSectionLibraryItemData {
  title: string;
}

/**
 * Normalise un titre pour déduplication
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Récupère toutes les sections de la bibliothèque de l'entreprise
 */
export const useQuoteSectionLibrary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quote_section_library", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        return [];
      }

      const { data, error } = await supabase
        .from("quote_section_library")
        .select("*")
        .eq("company_id", companyId)
        .order("times_used", { ascending: false })
        .order("last_used_at", { ascending: false, nullsLast: true });

      if (error) throw error;
      return (data || []) as QuoteSectionLibraryItem[];
    },
    enabled: !!user,
  });
};

/**
 * Recherche dans la bibliothèque de sections (autocomplete)
 */
export const useSearchQuoteSectionLibrary = (searchQuery: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quote_section_library_search", user?.id, searchQuery],
    queryFn: async () => {
      if (!user || !searchQuery.trim()) return [];

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        return [];
      }

      const normalizedQuery = normalizeTitle(searchQuery);

      const { data, error } = await supabase
        .from("quote_section_library")
        .select("*")
        .eq("company_id", companyId)
        .ilike("title_normalized", `%${normalizedQuery}%`)
        .order("times_used", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as QuoteSectionLibraryItem[];
    },
    enabled: !!user && searchQuery.trim().length > 0,
  });
};

/**
 * Ajoute ou met à jour une section dans la bibliothèque (upsert)
 */
export const useUpsertQuoteSectionLibrary = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: CreateSectionLibraryItemData) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const titleNormalized = normalizeTitle(itemData.title);

      // Vérifier si existe déjà
      const { data: existing } = await supabase
        .from("quote_section_library")
        .select("*")
        .eq("company_id", companyId)
        .eq("title_normalized", titleNormalized)
        .maybeSingle();

      if (existing) {
        // Mettre à jour (incrémenter times_used, mettre à jour last_used_at)
        const { data, error } = await supabase
          .from("quote_section_library")
          .update({
            times_used: (existing.times_used || 0) + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as QuoteSectionLibraryItem;
      } else {
        // Créer nouveau
        const { data, error } = await supabase
          .from("quote_section_library")
          .insert({
            company_id: companyId,
            title: itemData.title,
            title_normalized: titleNormalized,
            times_used: 1,
            last_used_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data as QuoteSectionLibraryItem;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote_section_library"] });
    },
  });
};

/**
 * Supprime une section de la bibliothèque
 */
export const useDeleteQuoteSectionLibrary = () => {
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
        .from("quote_section_library")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote_section_library"] });
    },
  });
};
