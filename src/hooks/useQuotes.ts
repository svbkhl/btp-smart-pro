import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_QUOTES } from "@/fakeData/quotes";
import { generateQuoteNumber } from "@/utils/documentNumbering";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { extractUUID } from "@/utils/uuidExtractor";
import { getCurrentCompanyId } from "@/utils/companyHelpers";
import { computeQuoteTotals } from "@/utils/quoteCalculations";

export interface Quote {
  id: string;
  user_id: string;
  company_id?: string; // Multi-tenant
  client_name: string;
  client_email?: string;
  client_id?: string; // Lien vers clients
  project_id?: string;
  quote_number: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "signed" | "paid";
  estimated_cost: number;
  // Nouveaux champs refonte pro
  mode?: "simple" | "detailed"; // Mode devis
  tva_rate?: number; // Taux TVA personnalisable
  subtotal_ht?: number; // Total HT calculé
  total_tva?: number; // Total TVA calculé
  total_ttc?: number; // Total TTC calculé
  currency?: string; // Devise (défaut: EUR)
  // Ancien format (compatibilité)
  details?: {
    estimatedCost: number;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
  created_at: string;
  updated_at: string;
  sent_at?: string;
  // Colonnes de signature électronique
  signed?: boolean;
  signed_at?: string;
  signer_name?: string;
  signature_data?: string;
  signature_ip_address?: string;
  // Colonnes de paiement
  payment_status?: "pending" | "partially_paid" | "paid";
  paid_at?: string;
}

export interface CreateQuoteData {
  client_name: string;
  client_id?: string; // Lien vers clients
  project_id?: string;
  quote_number?: string;
  status?: "draft" | "sent" | "accepted" | "rejected" | "expired";
  estimated_cost: number;
  // Nouveaux champs refonte pro
  mode?: "simple" | "detailed"; // Mode devis
  tva_rate?: number; // Taux TVA (défaut: 0.20)
  currency?: string; // Devise (défaut: EUR)
  // Ancien format (compatibilité)
  details?: {
    estimatedCost: number;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {
  id: string;
}

// Hook pour récupérer tous les devis
export const useQuotes = () => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();

  return useQuery({
    queryKey: ["quotes", user?.id, fakeDataEnabled],
    queryFn: async () => {
      // Si fake data est activé, retourner directement les fake data
      if (fakeDataEnabled) {
        console.log("🎭 Mode démo activé - Retour des fake quotes");
        return FAKE_QUOTES;
      }

      // Sinon, faire la vraie requête
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          // Récupérer company_id pour filtrage multi-tenant
          const companyId = await getCurrentCompanyId(user.id);
          if (!companyId) {
            console.warn("User is not a member of any company");
            return [];
          }

          const { data, error } = await supabase
            .from("ai_quotes")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error) throw error;
          
          // ⚠️ SÉCURITÉ : S'assurer que tous les IDs sont des UUID purs (sans suffixe)
          // Si un ID contient un suffixe, l'extraire
          const cleanedData = (data || []).map((quote: any) => {
            if (quote.id && quote.id.length > 36) {
              const validId = extractUUID(quote.id);
              if (validId && validId !== quote.id) {
                console.warn("⚠️ [useQuotes] Quote avec ID contenant suffixe détecté:", { 
                  originalId: quote.id, 
                  cleanedId: validId 
                });
                return { ...quote, id: validId };
              }
            }
            return quote;
          });
          
          return cleanedData as Quote[];
        },
        [],
        "useQuotes"
      );
    },
    enabled: !!user || fakeDataEnabled,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: 60000, // Polling automatique toutes les 60s
  });
};

// Hook pour récupérer un devis par ID
// L'ID peut contenir un suffixe de sécurité (ex: "uuid-suffix")
export const useQuote = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quote", id, user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) throw new Error("User not authenticated or no ID provided");

          // Extraire l'UUID valide (peut contenir un suffixe)
          const validUuid = extractUUID(id);
          if (!validUuid) {
            console.error("❌ [useQuote] Impossible d'extraire l'UUID de:", id);
            throw new Error("Invalid quote ID format");
          }

          // ⚠️ LOG si l'ID original contenait un suffixe
          if (id !== validUuid) {
            console.warn("⚠️ [useQuote] ID avec suffixe détecté, utilisation de l'UUID extrait:", { 
              originalId: id, 
              extractedUuid: validUuid 
            });
          }

          const { data, error } = await supabase
            .from("ai_quotes")
            .select("*")
            .eq("id", validUuid) // Utiliser l'UUID extrait, pas l'ID complet
            .eq("user_id", user.id)
            .maybeSingle();

          if (!data) {
            throw new Error("Quote not found");
          }

          if (error) throw error;
          return data as Quote;
        },
        FAKE_QUOTES[0] || null,
        "useQuote"
      );
    },
    enabled: !!user && !!id,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });
};

// Hook pour créer un devis
export const useCreateQuote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteData: CreateQuoteData) => {
      if (!user) throw new Error("User not authenticated");

      // Récupérer company_id
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise pour créer un devis");
      }

      // Générer le numéro de devis automatiquement
      const quoteNumber = await generateQuoteNumber(user.id);
      console.log("📄 Numéro de devis généré:", quoteNumber);

      // Valeurs par défaut
      const mode = quoteData.mode || "simple";
      const tvaRate = quoteData.tva_rate ?? 0.20;
      const currency = quoteData.currency || "EUR";

      // Calculer les totaux initiaux (sera recalculé par trigger si lignes existent)
      const initialTotals = {
        subtotal_ht: quoteData.estimated_cost || 0,
        total_tva: (quoteData.estimated_cost || 0) * tvaRate,
        total_ttc: (quoteData.estimated_cost || 0) * (1 + tvaRate),
      };

      const { data, error } = await supabase
        .from("ai_quotes")
        .insert({
          ...quoteData,
          user_id: user.id,
          company_id: companyId,
          quote_number: quoteNumber,
          status: quoteData.status || "draft",
          mode: mode,
          tva_rate: tvaRate,
          currency: currency,
          subtotal_ht: initialTotals.subtotal_ht,
          total_tva: initialTotals.total_tva,
          total_ttc: initialTotals.total_ttc,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onSuccess: async (quote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      
      // Vérifier si l'envoi automatique est activé
      try {
        const { data: settings } = await supabase
          .from("user_settings")
          .select("auto_send_email")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (settings?.auto_send_email && quote.client_email) {
          // Envoyer automatiquement le devis par email
          try {
            const { sendQuoteEmail } = await import("@/services/emailService");
            await sendQuoteEmail({
              to: quote.client_email,
              quoteId: quote.id,
              quoteNumber: quote.quote_number || quote.id.substring(0, 8),
              clientName: quote.client_name || "Client",
            });
            
            // Mettre à jour le statut
            // Extraire l'UUID valide au cas où quote.id contiendrait un suffixe
            const validQuoteId = extractUUID(quote.id);
            if (validQuoteId) {
              await supabase
                .from("ai_quotes")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", validQuoteId);
            }

            toast({
              title: "Devis créé et envoyé",
              description: `Le devis a été créé et envoyé automatiquement à ${quote.client_email}`,
            });
          } catch (emailError: any) {
            console.error("Erreur envoi automatique devis:", emailError);
            toast({
              title: "Devis créé",
              description: "Le devis a été créé, mais l'envoi automatique a échoué.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Devis créé",
            description: "Le devis a été créé avec succès.",
          });
        }
      } catch (error) {
        console.error("Erreur vérification auto_send_email:", error);
        toast({
          title: "Devis créé",
          description: "Le devis a été créé avec succès.",
        });
      }
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

// Hook pour mettre à jour un devis
export const useUpdateQuote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...quoteData }: UpdateQuoteData) => {
      if (!user) throw new Error("User not authenticated");

      // Extraire l'UUID valide si l'ID contient un suffixe
      const validUuid = extractUUID(id);
      if (!validUuid) {
        throw new Error("Invalid quote ID format");
      }

      const { data, error } = await supabase
        .from("ai_quotes")
        .update(quoteData)
        .eq("id", validUuid) // Utiliser l'UUID extrait
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast({
        title: "Devis mis à jour",
        description: "Le devis a été mis à jour avec succès.",
      });
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

// Hook pour supprimer un devis
export const useDeleteQuote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      // Extraire l'UUID valide si l'ID contient un suffixe
      const validUuid = extractUUID(id);
      if (!validUuid) {
        throw new Error("Invalid quote ID format");
      }

      const { error } = await supabase
        .from("ai_quotes")
        .delete()
        .eq("id", validUuid) // Utiliser l'UUID extrait
        .eq("user_id", user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({
        title: "Devis supprimé",
        description: "Le devis a été supprimé avec succès.",
      });
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



