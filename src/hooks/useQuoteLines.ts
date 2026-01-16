/**
 * Hook pour gérer les lignes de devis (mode détaillé)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getCurrentCompanyId } from "@/utils/companyHelpers";
import { computeLineTotals } from "@/utils/quoteCalculations";

export interface QuoteLine {
  id: string;
  quote_id: string;
  company_id: string;
  section_id?: string | null; // Lien vers section (nullable)
  position: number;
  label: string;
  description?: string | null;
  category?: "labor" | "material" | "service" | "other" | null;
  unit?: string | null;
  quantity?: number | null;
  unit_price_ht?: number | null;
  total_ht: number;
  tva_rate: number;
  total_tva: number;
  total_ttc: number;
  price_source?: "manual" | "library" | "market_estimate" | "ai_estimate" | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteLineData {
  quote_id: string;
  section_id?: string | null; // Lien vers section
  position?: number;
  label: string;
  description?: string;
  category?: "labor" | "material" | "service" | "other";
  unit?: string;
  quantity?: number;
  unit_price_ht?: number;
  tva_rate?: number;
  price_source?: "manual" | "library" | "market_estimate" | "ai_estimate";
  metadata?: Record<string, any>;
}

export interface UpdateQuoteLineData extends Partial<CreateQuoteLineData> {
  id: string;
}

/**
 * Récupère toutes les lignes d'un devis
 */
export const useQuoteLines = (quoteId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quote_lines", quoteId, user?.id],
    queryFn: async () => {
      if (!user || !quoteId) throw new Error("User not authenticated or quote ID missing");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const { data, error } = await supabase
        .from("quote_lines")
        .select("*")
        .eq("quote_id", quoteId)
        .eq("company_id", companyId)
        .order("section_id", { ascending: true, nullsFirst: false })
        .order("position", { ascending: true });

      if (error) throw error;
      return (data || []) as QuoteLine[];
    },
    enabled: !!user && !!quoteId,
  });
};

/**
 * Crée une nouvelle ligne de devis
 */
export const useCreateQuoteLine = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineData: CreateQuoteLineData) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      // Calculer les totaux avant insertion (le trigger le fera aussi, mais on veut les avoir ici)
      const tvaRate = lineData.tva_rate ?? 0.20;
      const totals = computeLineTotals({
        quantity: lineData.quantity ?? null,
        unit_price_ht: lineData.unit_price_ht ?? null,
        tva_rate: tvaRate,
      });

      const { data, error } = await supabase
        .from("quote_lines")
        .insert({
          ...lineData,
          company_id: companyId,
          position: lineData.position ?? 0,
          tva_rate: tvaRate,
          total_ht: totals.total_ht,
          total_tva: totals.total_tva,
          total_ttc: totals.total_ttc,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuoteLine;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quote_lines", variables.quote_id] });
      queryClient.invalidateQueries({ queryKey: ["quote", variables.quote_id] });
    },
  });
};

/**
 * Met à jour une ligne de devis
 */
export const useUpdateQuoteLine = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...lineData }: UpdateQuoteLineData) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      // Si quantity ou unit_price_ht changent, recalculer les totaux
      let updateData: any = { ...lineData };
      if (lineData.quantity !== undefined || lineData.unit_price_ht !== undefined || lineData.tva_rate !== undefined) {
        // Récupérer la ligne actuelle pour avoir les valeurs complètes
        const { data: currentLine } = await supabase
          .from("quote_lines")
          .select("*")
          .eq("id", id)
          .eq("company_id", companyId)
          .single();

        if (currentLine) {
          const tvaRate = lineData.tva_rate ?? currentLine.tva_rate;
          const totals = computeLineTotals({
            quantity: lineData.quantity ?? currentLine.quantity ?? null,
            unit_price_ht: lineData.unit_price_ht ?? currentLine.unit_price_ht ?? null,
            tva_rate: tvaRate,
          });

          updateData = {
            ...updateData,
            tva_rate: tvaRate,
            total_ht: totals.total_ht,
            total_tva: totals.total_tva,
            total_ttc: totals.total_ttc,
          };
        }
      }

      const { data, error } = await supabase
        .from("quote_lines")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return data as QuoteLine;
    },
    onSuccess: (line) => {
      queryClient.invalidateQueries({ queryKey: ["quote_lines", line.quote_id] });
      queryClient.invalidateQueries({ queryKey: ["quote", line.quote_id] });
    },
  });
};

/**
 * Supprime une ligne de devis
 */
export const useDeleteQuoteLine = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const { error } = await supabase
        .from("quote_lines")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return { id, quoteId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quote_lines", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote", variables.quoteId] });
    },
  });
};

/**
 * Crée plusieurs lignes en une seule fois
 */
export const useCreateMultipleQuoteLines = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, lines }: { quoteId: string; lines: CreateQuoteLineData[] }) => {
      if (!user) throw new Error("User not authenticated");

      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      // Calculer les totaux pour chaque ligne
      const linesWithTotals = lines.map((line, index) => {
        const tvaRate = line.tva_rate ?? 0.20;
        const totals = computeLineTotals({
          quantity: line.quantity ?? null,
          unit_price_ht: line.unit_price_ht ?? null,
          tva_rate: tvaRate,
        });

        return {
          ...line,
          quote_id: quoteId,
          company_id: companyId,
          position: line.position ?? index,
          tva_rate: tvaRate,
          total_ht: totals.total_ht,
          total_tva: totals.total_tva,
          total_ttc: totals.total_ttc,
        };
      });

      const { data, error } = await supabase
        .from("quote_lines")
        .insert(linesWithTotals)
        .select();

      if (error) throw error;
      return (data || []) as QuoteLine[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quote_lines", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote", variables.quoteId] });
    },
  });
};
