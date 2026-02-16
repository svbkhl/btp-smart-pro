import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { usePermissions } from "./usePermissions";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_QUOTES } from "@/fakeData/quotes";
import { generateQuoteNumber } from "@/utils/documentNumbering";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { extractUUID } from "@/utils/uuidExtractor";
import { useCompanyId } from "./useCompanyId";
import { logger } from "@/utils/logger";
import { computeQuoteTotals } from "@/utils/quoteCalculations";
import { QUERY_CONFIG } from "@/utils/reactQueryConfig";

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
// Employé : uniquement ses propres devis | Owner/Admin : tous les devis de l'entreprise
export const useQuotes = () => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();
  const { isEmployee } = usePermissions();

  return useQuery({
    queryKey: ["quotes", companyId, isEmployee],
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
          if (!companyId) {
            logger.warn("useQuotes: No company_id available");
            return [];
          }

          // Filtrer par company_id pour isolation multi-tenant
          // Employé : uniquement ses devis | Owner/Admin : tous
          let query = supabase
            .from("ai_quotes")
            .select("*")
            .eq("company_id", companyId);
          if (isEmployee && user) {
            query = query.eq("user_id", user.id);
          }
          const { data, error } = await query.order("created_at", { ascending: false });

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
    enabled: (!!user && !isLoadingCompanyId && !!companyId) || fakeDataEnabled,
    ...QUERY_CONFIG.MODERATE, // Cache intelligent : 5min staleTime, pas de refetch auto
  });
};

// Hook pour récupérer un devis par ID
// L'ID peut contenir un suffixe de sécurité (ex: "uuid-suffix")
export const useQuote = (id: string | undefined) => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote", id, companyId],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) throw new Error("User not authenticated or no ID provided");
          if (!companyId) {
            logger.warn("useQuote: No company_id available");
            throw new Error("No company_id available");
          }

          // Extraire l'UUID valide (peut contenir un suffixe)
          const validUuid = extractUUID(id);
          if (!validUuid) {
            logger.error("useQuote: Cannot extract UUID from", { id });
            throw new Error("Invalid quote ID format");
          }

          // ⚠️ LOG si l'ID original contenait un suffixe
          if (id !== validUuid) {
            logger.warn("useQuote: ID with suffix detected", { 
              originalId: id, 
              extractedUuid: validUuid 
            });
          }

          const { data, error } = await supabase
            .from("ai_quotes")
            .select("*")
            .eq("id", validUuid) // Utiliser l'UUID extrait, pas l'ID complet
            .eq("company_id", companyId) // Filtrer par company_id pour isolation multi-tenant
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
    enabled: !!user && !!id && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour créer un devis
export const useCreateQuote = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteData: CreateQuoteData) => {
      if (!user) throw new Error("User not authenticated");
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
    onMutate: async (newQuoteData) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["quotes", companyId] });
      
      // Sauvegarder les données actuelles
      const previousQuotes = queryClient.getQueryData<Quote[]>(["quotes", companyId]);
      
      // Mettre à jour optimistiquement avec un devis temporaire
      if (previousQuotes && user && companyId) {
        const tempQuote: Quote = {
          id: `temp-${Date.now()}`,
          user_id: user.id,
          company_id: companyId,
          client_name: newQuoteData.client_name,
          client_email: newQuoteData.client_email,
          client_id: newQuoteData.client_id,
          project_id: newQuoteData.project_id,
          quote_number: "En cours...",
          status: newQuoteData.status || "draft",
          estimated_cost: newQuoteData.estimated_cost,
          mode: newQuoteData.mode,
          tva_rate: newQuoteData.tva_rate ?? 0.20,
          subtotal_ht: newQuoteData.estimated_cost || 0,
          total_tva: (newQuoteData.estimated_cost || 0) * (newQuoteData.tva_rate ?? 0.20),
          total_ttc: (newQuoteData.estimated_cost || 0) * (1 + (newQuoteData.tva_rate ?? 0.20)),
          details: newQuoteData.details,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData<Quote[]>(
          ["quotes", companyId],
          [tempQuote, ...previousQuotes]
        );
      }
      
      return { previousQuotes };
    },
    onSuccess: async (quote, _variables, context) => {
      // Remplacer le devis temporaire par le vrai
      queryClient.setQueryData<Quote[]>(
        ["quotes", companyId],
        (old) => {
          if (!old) return [quote];
          return old.map(q => q.id.startsWith('temp-') ? quote : q);
        }
      );
      
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
    onError: (error: Error, _variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousQuotes) {
        queryClient.setQueryData(["quotes", companyId], context.previousQuotes);
      }
      
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
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...quoteData }: UpdateQuoteData) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) throw new Error("No company_id available");

      // Extraire l'UUID valide si l'ID contient un suffixe
      const validUuid = extractUUID(id);
      if (!validUuid) {
        throw new Error("Invalid quote ID format");
      }

      const { data, error } = await supabase
        .from("ai_quotes")
        .update(quoteData)
        .eq("id", validUuid) // Utiliser l'UUID extrait
        .eq("company_id", companyId) // Filtrer par company_id pour isolation multi-tenant
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onMutate: async (updateData) => {
      const { id, ...updates } = updateData;
      const validUuid = extractUUID(id);
      
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["quotes", companyId] });
      await queryClient.cancelQueries({ queryKey: ["quote", id, companyId] });
      
      // Sauvegarder les données actuelles
      const previousQuotes = queryClient.getQueryData<Quote[]>(["quotes", companyId]);
      const previousQuote = queryClient.getQueryData<Quote>(["quote", id, companyId]);
      
      // Mettre à jour optimistiquement la liste
      if (previousQuotes && validUuid) {
        queryClient.setQueryData<Quote[]>(
          ["quotes", companyId],
          previousQuotes.map(q =>
            (q.id === id || q.id === validUuid) ? { ...q, ...updates, updated_at: new Date().toISOString() } : q
          )
        );
      }
      
      // Mettre à jour optimistiquement le devis individuel
      if (previousQuote) {
        queryClient.setQueryData<Quote>(
          ["quote", id, companyId],
          { ...previousQuote, ...updates, updated_at: new Date().toISOString() }
        );
      }
      
      return { previousQuotes, previousQuote };
    },
    onSuccess: (updatedQuote) => {
      // Mettre à jour avec les vraies données du serveur
      const validUuid = extractUUID(updatedQuote.id);
      
      queryClient.setQueryData<Quote[]>(
        ["quotes", companyId],
        (old) => old?.map(q => q.id === updatedQuote.id || q.id === validUuid ? updatedQuote : q)
      );
      queryClient.setQueryData(["quote", updatedQuote.id, companyId], updatedQuote);
      if (validUuid && validUuid !== updatedQuote.id) {
        queryClient.setQueryData(["quote", validUuid, companyId], updatedQuote);
      }
      
      toast({
        title: "Devis mis à jour",
        description: "Le devis a été mis à jour avec succès.",
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousQuotes) {
        queryClient.setQueryData(["quotes", companyId], context.previousQuotes);
      }
      if (context?.previousQuote) {
        queryClient.setQueryData(["quote", variables.id, companyId], context.previousQuote);
      }
      
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
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) throw new Error("No company_id available");

      // Extraire l'UUID valide si l'ID contient un suffixe
      const validUuid = extractUUID(id);
      if (!validUuid) {
        throw new Error("Invalid quote ID format");
      }

      const { error } = await supabase
        .from("ai_quotes")
        .delete()
        .eq("id", validUuid) // Utiliser l'UUID extrait
        .eq("company_id", companyId); // Filtrer par company_id pour isolation multi-tenant

      if (error) throw error;
      
      // Attendre un peu pour s'assurer que la suppression est complète
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return id;
    },
    onMutate: async (deletedId) => {
      const validUuid = extractUUID(deletedId);
      
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["quotes", companyId] });
      
      // Sauvegarder les données actuelles
      const previousQuotes = queryClient.getQueryData<Quote[]>(["quotes", companyId]);
      
      // Supprimer optimistiquement de la liste
      if (previousQuotes) {
        const filtered = previousQuotes.filter((quote: Quote) => {
          const quoteId = quote.id || "";
          const quoteUuid = extractUUID(quoteId);
          return quoteUuid !== validUuid && quoteId !== deletedId;
        });
        
        queryClient.setQueryData<Quote[]>(["quotes", companyId], filtered);
        logger.debug("useDeleteQuote: Optimistic delete", { before: previousQuotes.length, after: filtered.length });
      }
      
      // Supprimer le cache du devis individuel
      queryClient.removeQueries({ queryKey: ["quote", deletedId, companyId] });
      if (validUuid && validUuid !== deletedId) {
        queryClient.removeQueries({ queryKey: ["quote", validUuid, companyId] });
      }
      
      return { previousQuotes };
    },
    onSuccess: (_, deletedQuoteId) => {
      logger.info("useDeleteQuote: Quote deleted successfully", { deletedQuoteId });
      toast({
        title: "Devis supprimé",
        description: "Le devis a été supprimé définitivement.",
      });
    },
    onError: (error: any, _deletedId, context) => {
      // Rollback en cas d'erreur
      if (context?.previousQuotes) {
        queryClient.setQueryData(["quotes", companyId], context.previousQuotes);
      }
      
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
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) throw new Error("No company_id available");
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
        .eq("company_id", companyId); // Filtrer par company_id pour isolation multi-tenant

      if (error) throw error;
      
      // Attendre un peu pour s'assurer que la suppression est complète
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onSuccess: async (_, deletedQuoteIds: string[]) => {
      logger.debug("useDeleteQuotesBulk: Deleting quotes from cache", { count: deletedQuoteIds.length });
      
      // Extraire les UUIDs pour la comparaison
      const deletedUuids = deletedQuoteIds.map(id => extractUUID(id)).filter(Boolean) as string[];
      
      // Mettre à jour le cache pour supprimer tous les devis supprimés
      queryClient.setQueryData(["quotes", companyId], (oldData: Quote[] | undefined) => {
        if (!oldData || !Array.isArray(oldData)) {
          return oldData;
        }
        const filtered = oldData.filter((quote: Quote) => {
          const quoteId = quote.id || "";
          const validUuid = extractUUID(quoteId);
          return !deletedUuids.includes(validUuid) && !deletedQuoteIds.includes(quoteId);
        });
        logger.debug("useDeleteQuotesBulk: Cache updated", { before: oldData.length, after: filtered.length });
        return filtered;
      });
      
      queryClient.invalidateQueries({ queryKey: ["quotes", companyId], refetchType: "none" });
      deletedQuoteIds.forEach(id => {
        queryClient.removeQueries({ queryKey: ["quote", id] });
      });
      
      logger.info("useDeleteQuotesBulk: Quotes deleted successfully", { count: deletedQuoteIds.length });
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

