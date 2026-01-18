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
  tva_non_applicable_293b?: boolean; // TVA non applicable article 293B
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
  tva_non_applicable_293b?: boolean; // TVA non applicable article 293B
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
  sent_at?: string;
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

          // Construire la requête : filtrer par user_id (comme useAIQuotes mais avec sécurité)
          // On filtre par user_id pour la sécurité, pas par company_id pour voir tous les devis de l'utilisateur
          const { data, error } = await supabase
            .from("ai_quotes")
            .select("*")
            .eq("user_id", user.id) // Filtrer par user_id pour la sécurité
            .order("created_at", { ascending: false });

          if (error) throw error;
          
          // ⚠️ SÉCURITÉ : S'assurer que tous les IDs sont des UUID purs (sans suffixe)
          // Si un ID contient un suffixe, l'extraire
          // ⚠️ CALCUL DES TOTAUX : S'assurer que total_ttc est calculé si manquant
          const cleanedData = (data || []).map((quote: any) => {
            if (quote.id && quote.id.length > 36) {
              const validId = extractUUID(quote.id);
              if (validId && validId !== quote.id) {
                console.warn("⚠️ [useQuotes] Quote avec ID contenant suffixe détecté:", { 
                  originalId: quote.id, 
                  cleanedId: validId 
                });
                quote = { ...quote, id: validId };
              }
            }
            
            // Si total_ttc n'existe pas ou est 0, mais que estimated_cost existe, utiliser estimated_cost
            if ((!quote.total_ttc || quote.total_ttc === 0) && quote.estimated_cost && quote.estimated_cost > 0) {
              console.log("💰 [useQuotes] Correction du total_ttc manquant:", {
                quote_number: quote.quote_number,
                estimated_cost: quote.estimated_cost,
                total_ttc_avant: quote.total_ttc,
                total_ttc_après: quote.estimated_cost
              });
              quote.total_ttc = quote.estimated_cost;
            }
            
            // Si total_ttc et estimated_cost sont tous les deux 0 ou manquants, logger un avertissement
            if ((!quote.total_ttc || quote.total_ttc === 0) && (!quote.estimated_cost || quote.estimated_cost === 0)) {
              console.warn("⚠️ [useQuotes] Quote sans montant valide:", {
                quote_number: quote.quote_number,
                total_ttc: quote.total_ttc,
                estimated_cost: quote.estimated_cost
              });
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

      // Calculer les totaux initiaux (sera recalculé par trigger si lignes existent)
      const initialTotals = {
        subtotal_ht: quoteData.estimated_cost || 0,
        total_tva: (quoteData.estimated_cost || 0) * tvaRate,
        total_ttc: (quoteData.estimated_cost || 0) * (1 + tvaRate),
      };

      // Préparer les données d'insertion (exclure currency si non présent en DB)
      const insertData: any = {
        ...quoteData,
        user_id: user.id,
        company_id: companyId,
        quote_number: quoteNumber,
        status: quoteData.status || "draft",
        mode: mode,
        tva_rate: tvaRate,
        subtotal_ht: initialTotals.subtotal_ht,
        total_tva: initialTotals.total_tva,
        total_ttc: initialTotals.total_ttc,
      };

      // N'inclure currency que s'il est explicitement fourni (colonne peut ne pas exister en DB)
      // Ne pas définir de valeur par défaut pour éviter les erreurs si la colonne n'existe pas
      if (quoteData.currency) {
        insertData.currency = quoteData.currency;
      }

      const { data, error } = await supabase
        .from("ai_quotes")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onSuccess: async (quote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      
      // Générer automatiquement le PDF après la création
      try {
        const { downloadQuotePDF } = await import("@/services/pdfService");
        const { data: companyInfo } = await supabase
          .from("companies")
          .select("*")
          .eq("id", quote.company_id)
          .maybeSingle();

        await downloadQuotePDF({
          result: quote.details || {},
          companyInfo: companyInfo || undefined,
          clientInfo: {
            name: quote.client_name || "",
            email: quote.client_email,
            phone: quote.client_phone,
            location: quote.client_address,
          },
          surface: "",
          workType: "",
          region: "",
          quoteDate: new Date(quote.created_at),
          quoteNumber: quote.quote_number || quote.id.substring(0, 8),
          mode: quote.mode || "simple",
          tvaRate: quote.tva_rate || 0.20,
          tva293b: quote.tva_non_applicable_293b || false,
          sections: quote.sections || [],
          lines: quote.lines || [],
          subtotal_ht: quote.subtotal_ht || quote.estimated_cost || 0,
          total_tva: quote.total_tva || 0,
          total_ttc: quote.total_ttc || quote.estimated_cost || 0,
        });

        toast({
          title: "PDF généré",
          description: "Le devis a été téléchargé en PDF automatiquement.",
        });
      } catch (pdfError: any) {
        console.warn("⚠️ Erreur génération PDF automatique:", pdfError);
        // Ne pas bloquer la création si le PDF échoue
      }
      
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
  const { fakeDataEnabled } = useFakeDataStore();

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
      
      // Attendre un peu pour s'assurer que la suppression est complète
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return id;
    },
    onSuccess: async (_, deletedQuoteId: string) => {
      console.log("🔄 [useDeleteQuote] Suppression du devis:", deletedQuoteId);
      
      // ✅ SUPPRESSION IMMÉDIATE DU CACHE - Mise à jour optimiste
      // Mettre à jour toutes les variantes de la query ["quotes"]
      const queryKeysToUpdate = [
        ["quotes", user?.id, fakeDataEnabled],
        ["quotes", user?.id, true],
        ["quotes", user?.id, false],
        ["quotes"],
      ];
      
      queryKeysToUpdate.forEach(queryKey => {
        queryClient.setQueriesData(
          { queryKey, exact: false }, 
          (oldData: Quote[] | undefined | any) => {
            // Vérifier que oldData est un tableau valide
            if (!oldData || !Array.isArray(oldData)) {
              return oldData;
            }
            // Filtrer le devis supprimé (comparer avec l'ID original ou l'UUID extrait)
            const filtered = oldData.filter((quote: Quote) => {
              const quoteId = quote.id || "";
              const validUuid = extractUUID(quoteId);
              const deletedUuid = extractUUID(deletedQuoteId);
              return validUuid !== deletedUuid && quoteId !== deletedQuoteId;
            });
            if (filtered.length !== oldData.length) {
              console.log("🗑️ [useDeleteQuote] Cache mis à jour pour", queryKey, "- Avant:", oldData.length, "Après:", filtered.length);
            }
            return filtered;
          }
        );
      });
      
      // Invalider toutes les queries quotes (sans refetch automatique pour éviter qu'il revienne)
      queryClient.invalidateQueries({ queryKey: ["quotes"], exact: false, refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["quote", deletedQuoteId], exact: false, refetchType: "none" });
      
      // Supprimer explicitement la query du devis supprimé
      queryClient.removeQueries({ queryKey: ["quote", deletedQuoteId], exact: false });
      
      console.log("✅ [useDeleteQuote] Devis supprimé du cache (sans refetch)");
      toast({
        title: "Devis supprimé",
        description: "Le devis a été supprimé définitivement.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le devis",
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer plusieurs devis en masse
export const useDeleteQuotesBulk = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error("User not authenticated");
      if (ids.length === 0) return;

      // Extraire les UUIDs valides
      const validUuids = ids.map(id => extractUUID(id)).filter(Boolean) as string[];
      if (validUuids.length === 0) {
        throw new Error("Aucun ID valide");
      }

      const { error } = await supabase
        .from("ai_quotes")
        .delete()
        .in("id", validUuids)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Attendre un peu pour s'assurer que la suppression est complète
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onSuccess: async (_, deletedQuoteIds: string[]) => {
      console.log("🔄 [useDeleteQuotesBulk] Suppression de", deletedQuoteIds.length, "devis");
      
      // Extraire les UUIDs pour la comparaison
      const deletedUuids = deletedQuoteIds.map(id => extractUUID(id)).filter(Boolean) as string[];
      
      // Mettre à jour le cache pour supprimer tous les devis supprimés
      const queryKeysToUpdate = [
        ["quotes", user?.id, fakeDataEnabled],
        ["quotes", user?.id, true],
        ["quotes", user?.id, false],
        ["quotes"],
      ];
      
      queryKeysToUpdate.forEach(queryKey => {
        queryClient.setQueriesData(
          { queryKey, exact: false }, 
          (oldData: Quote[] | undefined | any) => {
            if (!oldData || !Array.isArray(oldData)) {
              return oldData;
            }
            const filtered = oldData.filter((quote: Quote) => {
              const quoteId = quote.id || "";
              const validUuid = extractUUID(quoteId);
              return !deletedUuids.includes(validUuid) && !deletedQuoteIds.includes(quoteId);
            });
            if (filtered.length !== oldData.length) {
              console.log("🗑️ [useDeleteQuotesBulk] Cache mis à jour - Avant:", oldData.length, "Après:", filtered.length);
            }
            return filtered;
          }
        );
      });
      
      queryClient.invalidateQueries({ queryKey: ["quotes"], exact: false, refetchType: "none" });
      deletedQuoteIds.forEach(id => {
        queryClient.removeQueries({ queryKey: ["quote", id], exact: false });
      });
      
      toast({
        title: "Devis supprimés",
        description: `${deletedQuoteIds.length} devis supprimé${deletedQuoteIds.length > 1 ? 's' : ''} définitivement.`,
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

