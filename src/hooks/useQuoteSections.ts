/**
 * Hook pour gérer les sections de devis (corps de métier)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";

export interface QuoteSection {
  id: string;
  quote_id: string;
  company_id: string;
  position: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSectionData {
  quote_id: string;
  position?: number;
  title: string;
}

export interface UpdateSectionData extends Partial<CreateSectionData> {
  id: string;
}

/**
 * Récupère toutes les sections d'un devis
 */
export const useQuoteSections = (quoteId: string | undefined) => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote_sections", quoteId, user?.id],
    queryFn: async () => {
      if (!user || !quoteId) throw new Error("User not authenticated or quote ID missing");

      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const { data, error } = await supabase
        .from("quote_sections")
        .select("*")
        .eq("quote_id", quoteId)
        .eq("company_id", companyId)
        .order("position", { ascending: true });

      if (error) throw error;
      return (data || []) as QuoteSection[];
    },
    enabled: !!user && !!quoteId,
  });
};

/**
 * Crée une nouvelle section
 */
export const useCreateQuoteSection = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sectionData: CreateSectionData) => {
      if (!user) throw new Error("User not authenticated");

      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const { data, error } = await supabase
        .from("quote_sections")
        .insert({
          ...sectionData,
          company_id: companyId,
          position: sectionData.position ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuoteSection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quote_sections", variables.quote_id] });
    },
  });
};

/**
 * Met à jour une section
 */
export const useUpdateQuoteSection = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...sectionData }: UpdateSectionData) => {
      if (!user) throw new Error("User not authenticated");

      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const { data, error } = await supabase
        .from("quote_sections")
        .update(sectionData)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return data as QuoteSection;
    },
    onSuccess: (section) => {
      queryClient.invalidateQueries({ queryKey: ["quote_sections", section.quote_id] });
    },
  });
};

/**
 * Supprime une section
 */
export const useDeleteQuoteSection = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      if (!user) throw new Error("User not authenticated");

      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const { error } = await supabase
        .from("quote_sections")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return { id, quoteId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quote_sections", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote_lines", variables.quoteId] });
    },
  });
};

/**
 * Réorganise les sections (met à jour les positions)
 */
export const useReorderQuoteSections = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, sectionIds }: { quoteId: string; sectionIds: string[] }) => {
      if (!user) throw new Error("User not authenticated");

      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      // Mettre à jour les positions
      const updates = sectionIds.map((sectionId, index) => ({
        id: sectionId,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from("quote_sections")
          .update({ position: update.position })
          .eq("id", update.id)
          .eq("company_id", companyId);
      }

      return { quoteId, sectionIds };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quote_sections", variables.quoteId] });
    },
  });
};
