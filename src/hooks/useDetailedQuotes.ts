/**
 * Hook spécialisé pour les devis détaillés
 * Utilise ai_quotes SANS la colonne mode (qui n'existe pas)
 * Création manuelle uniquement, pas d'IA
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useCompanyId } from "./useCompanyId";
import { logger } from "@/utils/logger";
import { generateQuoteNumber } from "@/utils/documentNumbering";

export interface DetailedQuote {
  id: string;
  company_id: string;
  client_id: string;
  client_name: string;
  tva_rate: number;
  tva_non_applicable_293b: boolean;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  quote_number: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDetailedQuoteData {
  client_id?: string;
  client_name: string;
  tva_rate?: number;
  tva_non_applicable_293b?: boolean;
}

export interface UpdateDetailedQuoteData {
  id: string;
  tva_rate?: number;
  tva_non_applicable_293b?: boolean;
  subtotal_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  details?: Record<string, any>;
}

/**
 * Crée un devis détaillé dans ai_quotes (SANS colonne mode)
 */
export const useCreateDetailedQuote = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteData: CreateDetailedQuoteData): Promise<DetailedQuote> => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise pour créer un devis");
      }

      logger.debug("useCreateDetailedQuote: Creating detailed quote", { quoteData });

      // Générer le numéro de devis
      const quoteNumber = await generateQuoteNumber(user.id);
      console.log("📄 Numéro de devis généré:", quoteNumber);

      // Valeurs par défaut
      const tvaRate = quoteData.tva_rate ?? 0.20;
      const tva293b = quoteData.tva_non_applicable_293b ?? false;

      // Préparer les données d'insertion
      // On inclut les colonnes même si elles peuvent ne pas exister (PostgREST les ignorera)
      const insertData: any = {
        user_id: user.id,
        client_name: quoteData.client_name,
        quote_number: quoteNumber,
        status: "draft",
        estimated_cost: 0,
      };

      // ⚠️ SÉCURITÉ : Ne JAMAIS passer company_id depuis le frontend
      // Le trigger backend force company_id depuis le JWT pour sécurité maximale
      // On vérifie companyId uniquement pour validation frontend, mais on ne l'envoie pas
      
      if (quoteData.client_id) {
        insertData.client_id = quoteData.client_id;
      }

      // Ajouter TVA (si colonnes existent)
      insertData.tva_rate = tva293b ? 0 : tvaRate;
      insertData.tva_non_applicable_293b = tva293b;
      
      // Totaux à 0 initialement (seront recalculés)
      insertData.subtotal_ht = 0;
      insertData.total_tva = 0;
      insertData.total_ttc = 0;

      console.log("🔧 [useCreateDetailedQuote] Payload insertion:", JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from("ai_quotes")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("❌ [useCreateDetailedQuote] Erreur Supabase complète:", JSON.stringify(error, null, 2));
        
        // Si l'erreur concerne des colonnes qui n'existent pas, réessayer avec payload minimal
        if (error.message?.includes("Could not find") || error.code === "PGRST204") {
          console.log("🔄 [useCreateDetailedQuote] Réessai avec payload minimal...");
          
          // Payload minimal absolu
          const minimalData: any = {
            user_id: user.id,
            client_name: quoteData.client_name,
            quote_number: quoteNumber,
            status: "draft",
            estimated_cost: 0,
          };
          
          const { data: retryData, error: retryError } = await supabase
            .from("ai_quotes")
            .insert(minimalData)
            .select()
            .single();
          
          if (retryError) {
            console.error("❌ [useCreateDetailedQuote] Erreur même avec payload minimal:", JSON.stringify(retryError, null, 2));
            throw new Error(retryError.message || "Erreur lors de la création du devis");
          }
          
          console.log("✅ [useCreateDetailedQuote] Devis créé avec payload minimal:", retryData.id);
          
          // Mettre à jour avec les colonnes optionnelles si elles existent
          // ⚠️ SÉCURITÉ : Ne JAMAIS passer company_id depuis le frontend
          // Le trigger backend force company_id depuis le JWT pour sécurité maximale
          const updateData: any = {};
          // company_id est forcé par le trigger backend, on ne le passe pas
          if (quoteData.client_id) updateData.client_id = quoteData.client_id;
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("ai_quotes")
              .update(updateData)
              .eq("id", retryData.id);
          }
          
          return retryData as DetailedQuote;
        }
        
        throw new Error(error.message || "Erreur lors de la création du devis");
      }

      console.log("✅ [useCreateDetailedQuote] Devis créé:", data.id);

      return data as DetailedQuote;
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      console.log("✅ [useCreateDetailedQuote] Devis sauvegardé, cache invalidé");
    },
    onError: (error: Error) => {
      console.error("❌ [useCreateDetailedQuote] Erreur mutation:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Met à jour un devis détaillé
 */
export const useUpdateDetailedQuote = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...updateData
    }: UpdateDetailedQuoteData) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      logger.debug("useUpdateDetailedQuote: Updating quote", { id, updateData });

      const { data, error } = await supabase
        .from("ai_quotes")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) {
        console.error("❌ [useUpdateDetailedQuote] Erreur Supabase:", JSON.stringify(error, null, 2));
        throw new Error(error.message || "Erreur lors de la mise à jour");
      }

      return data as DetailedQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
