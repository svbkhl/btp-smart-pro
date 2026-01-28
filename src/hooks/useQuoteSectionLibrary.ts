/**
 * Hook pour gérer la bibliothèque de sections réutilisables
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";

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
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote_section_library", companyId],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

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
    enabled: !!user && !isLoadingCompanyId && !!companyId,
  });
};

/**
 * Recherche dans la bibliothèque de sections (autocomplete)
 */
export const useSearchQuoteSectionLibrary = (searchQuery: string) => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote_section_library_search", companyId, searchQuery],
    queryFn: async () => {
      if (!user || !searchQuery.trim()) return [];

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

      // Gérer silencieusement les erreurs 404 (table n'existe pas)
      if (error) {
        if (error.code === "PGRST204" || error.message?.includes("Could not find") || error.message?.includes("404")) {
          return []; // Retourner un tableau vide si la table n'existe pas
        }
        throw error;
      }
      return (data || []) as QuoteSectionLibraryItem[];
    },
    enabled: !!user && searchQuery.trim().length > 0 && !isLoadingCompanyId && !!companyId,
  });
};

/**
 * Ajoute ou met à jour une section dans la bibliothèque (upsert)
 */
export const useUpsertQuoteSectionLibrary = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: CreateSectionLibraryItemData) => {
      if (!user) throw new Error("User not authenticated");

      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const titleNormalized = normalizeTitle(itemData.title);

      // Vérifier si existe déjà
      const { data: existing, error: checkError } = await supabase
        .from("quote_section_library")
        .select("*")
        .eq("company_id", companyId)
        .eq("title_normalized", titleNormalized)
        .maybeSingle();

      // Gérer silencieusement les erreurs 404 (table n'existe pas)
      if (checkError && (checkError.code === "PGRST204" || checkError.message?.includes("Could not find") || checkError.message?.includes("404"))) {
        // Table n'existe pas, retourner un objet factice
        return {
          id: "",
          company_id: companyId,
          title: itemData.title,
          title_normalized: titleNormalized,
          times_used: 0,
          last_used_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as QuoteSectionLibraryItem;
      }

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

        if (error) {
          // Gérer silencieusement les erreurs 404
          if (error.code === "PGRST204" || error.message?.includes("Could not find") || error.message?.includes("404")) {
            return existing;
          }
          throw error;
        }
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
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

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
