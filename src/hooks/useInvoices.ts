import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_INVOICES } from "@/fakeData/invoices";
import { generateInvoiceNumber } from "@/utils/documentNumbering";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

// ✅ HELPER P0: Mapper les colonnes DB vers l'interface (compatibilité)
export function normalizeInvoice(invoice: any): Invoice {
  if (!invoice) return invoice;
  
  // ✅ CORRECTION: Prioriser total_ttc, puis amount_ttc, puis amount pour éviter les montants à 0
  const totalTTC = invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? 0;
  const totalHT = invoice.total_ht ?? invoice.amount_ht ?? (totalTTC && invoice.tva ? totalTTC - invoice.tva : (invoice.tva && invoice.total_ht ? invoice.total_ht : (totalTTC && invoice.vat_rate ? totalTTC / (1 + (invoice.vat_rate / 100)) : totalTTC)));
  const tvaAmount = invoice.tva ?? invoice.vat_amount ?? (totalTTC && totalHT ? totalTTC - totalHT : 0);
  
  // ✅ CORRECTION: S'assurer que si amount est 0 mais que total_ttc existe, utiliser total_ttc
  const finalAmount = invoice.amount && invoice.amount > 0 ? invoice.amount : (totalTTC > 0 ? totalTTC : 0);
  
  return {
    ...invoice,
    // Utiliser total_ht, total_ttc, tva (colonnes réelles) ou fallback sur amount_ht, amount_ttc, vat_amount (legacy)
    amount_ht: totalHT,
    amount_ttc: totalTTC,
    vat_amount: tvaAmount,
    vat_rate: invoice.vat_rate ?? (tvaAmount && totalHT && totalHT > 0 ? (tvaAmount / totalHT) * 100 : 20),
    // S'assurer que les colonnes réelles sont aussi présentes
    total_ht: invoice.total_ht ?? (totalHT > 0 ? totalHT : undefined),
    total_ttc: invoice.total_ttc ?? (totalTTC > 0 ? totalTTC : undefined),
    tva: invoice.tva ?? (tvaAmount > 0 ? tvaAmount : undefined),
    amount: finalAmount, // ✅ Utiliser le montant le plus élevé disponible
  } as Invoice;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  quote_id?: string;
  description?: string;
  // ✅ CORRECTION P0: Colonnes réelles de la DB (total_ht, total_ttc, tva)
  total_ht?: number;
  total_ttc?: number;
  tva?: number;
  amount: number; // NOT NULL dans le schéma de base
  // Colonnes legacy/compatibilité (pour migration progressive)
  amount_ht?: number;
  amount_ttc?: number;
  vat_rate?: number;
  vat_amount?: number;
  status: "draft" | "sent" | "signed" | "paid" | "cancelled";
  payment_status?: "pending" | "paid" | "partial" | "failed";
  due_date?: string;
  paid_at?: string;
  signature_data?: string;
  signature_url?: string;
  signature_token?: string;
  signed_by?: string;
  signed_at?: string;
  service_lines?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceData {
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  quote_id?: string;
  description?: string;
  amount_ht: number; // HT calculé depuis TTC saisi
  amount_ttc?: number; // ✅ NOUVEAU: TTC saisi directement par l'utilisateur (source de vérité)
  vat_rate?: number;
  due_date?: string;
  service_lines?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  id: string;
}

// Hook pour récupérer toutes les factures
export const useInvoices = () => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["invoices", user?.id, fakeDataEnabled],
    queryFn: async () => {
      // Si fake data est activé, retourner directement les fake data
      if (fakeDataEnabled) {
        console.log("🎭 Mode démo activé - Retour des fake invoices");
        return FAKE_INVOICES;
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

          // ✅ CORRECTION P0: Sélectionner uniquement les colonnes qui existent réellement
          const { data, error } = await supabase
            .from("invoices")
            .select(`
              id, user_id, company_id, client_id, quote_id, invoice_number, status, 
              amount, due_date, paid_date, created_at, updated_at,
              client_name, client_email,
              total_ht, total_ttc, tva
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error) {
            // ✅ LOG COMPLET SI ERREUR (P0)
            console.error("❌ [useInvoices] Erreur fetch invoices:", {
              code: error?.code,
              message: error?.message,
              details: error?.details,
              hint: error?.hint
            });
            throw error;
          }
          
          // ✅ CORRECTION: Récupérer la liste des factures supprimées du cache et les exclure
          // Cette liste persiste même après les refetch et empêche les factures supprimées de réapparaître
          const deletedInvoicesSet = queryClient.getQueryData<Set<string>>(["deleted_invoices"]) || new Set<string>();
          
          if (deletedInvoicesSet.size > 0) {
            console.log("🛡️ [useInvoices] Filtrage des factures supprimées:", deletedInvoicesSet.size, "ID(s)");
          }
          
          // ✅ NORMALISER les invoices pour compatibilité + convertir invoice_lines en service_lines
          // ✅ FILTRER aussi les factures supprimées pour éviter qu'elles réapparaissent (MÊME APRÈS REFETCH)
          const filtered = (data || []).filter((inv: any) => {
            // Exclure les factures qui sont dans la liste des supprimées
            if (deletedInvoicesSet.has(inv.id)) {
              console.warn("⚠️ [useInvoices] Facture supprimée détectée dans les données, exclusion:", inv.id, inv.invoice_number);
              return false;
            }
            return true;
          });
          
          if (filtered.length !== (data || []).length) {
            console.log("🗑️ [useInvoices] Factures filtrées:", {
              total: (data || []).length,
              après_filtre: filtered.length,
              supprimées: (data || []).length - filtered.length
            });
          }
          
          return filtered
            .map((inv: any) => {
              const normalized = normalizeInvoice(inv);
              // Convertir invoice_lines en service_lines pour compatibilité
              if (inv.invoice_lines && Array.isArray(inv.invoice_lines)) {
                (normalized as any).service_lines = inv.invoice_lines
                  .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                  .map((line: any) => ({
                    description: line.label || line.description || "",
                    quantity: line.quantity || 1,
                    unit_price: line.unit_price_ht || 0,
                    total: line.total_ht || (line.quantity * line.unit_price_ht) || 0,
                  }));
              }
              return normalized;
            }) as Invoice[];
        },
        [],
        "useInvoices"
      );
    },
    enabled: !!user || fakeDataEnabled,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: (query) => {
      // ✅ CORRECTION: Vérifier si des factures ont été supprimées récemment
      // Si oui, ne pas refetch pour éviter de recharger les factures supprimées
      const deletedInvoices = queryClient.getQueryData<Set<string>>(["deleted_invoices"]);
      if (deletedInvoices && deletedInvoices.size > 0) {
        // Si des factures ont été supprimées, attendre 5 minutes avant de refetch
        // Cela évite de recharger les factures supprimées trop rapidement
        return 300000; // 5 minutes au lieu de 60 secondes
      }
      return 60000; // Polling automatique toutes les 60s normalement
    },
  });
};

// Hook pour récupérer une facture par ID
export const useInvoice = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoice", id, user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) throw new Error("User not authenticated or no ID provided");

          // ✅ CORRECTION P0: Sélectionner uniquement les colonnes qui existent réellement
          // ✅ Récupérer aussi les invoice_lines (lignes détaillées)
          // Récupérer company_id pour vérification multi-tenant
          const companyId = await getCurrentCompanyId(user.id);
          if (!companyId) {
            throw new Error("User is not a member of any company");
          }

          const { data, error } = await supabase
            .from("invoices")
            .select(`
              id, user_id, company_id, client_id, quote_id, invoice_number, status, 
              amount, due_date, paid_date, created_at, updated_at,
              client_name, client_email,
              total_ht, total_ttc, tva,
              invoice_lines (
                id, invoice_id, position, label, description, unit,
                quantity, unit_price_ht, total_ht, tva_rate, total_tva, total_ttc
              )
            `)
            .eq("id", id)
            .eq("company_id", companyId) // ✅ Multi-tenant: filtrer par company_id
            .maybeSingle();

          if (error) {
            // ✅ LOG COMPLET SI ERREUR (P0)
            console.error("❌ [useInvoice] Erreur fetch invoice:", {
              code: error?.code,
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              invoiceId: id
            });
            throw error;
          }

          if (!data) {
            throw new Error("Invoice not found");
          }
          // ✅ NORMALISER l'invoice pour compatibilité + convertir invoice_lines en service_lines
          const normalized = normalizeInvoice(data);
          // Convertir invoice_lines en service_lines pour compatibilité
          if (data.invoice_lines && Array.isArray(data.invoice_lines)) {
            (normalized as any).service_lines = data.invoice_lines
              .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
              .map((line: any) => ({
                description: line.label || line.description || "",
                quantity: line.quantity || 1,
                unit_price: line.unit_price_ht || 0,
                total: line.total_ht || (line.quantity * line.unit_price_ht) || 0,
              }));
          }
          return normalized as Invoice;
        },
        FAKE_INVOICES[0] || null,
        "useInvoice"
      );
    },
    enabled: !!user && !!id,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });
};

// Hook pour créer une facture
export const useCreateInvoice = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();

  return useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      if (!user) throw new Error("User not authenticated");

      // ⚠️ IMPORTANT: Toujours générer un nouveau numéro de facture (FACTURE-YYYY-XXX)
      // même si la facture est créée depuis un devis
      let invoiceNumber: string;
      let quoteSections: any[] = [];
      let quoteLines: any[] = [];
      
      // Variables pour stocker les données du devis (déclarées avant utilisation)
      let quoteData: any = null;
      let quoteTvaRate: number | null = null;
      let quoteTva293b: boolean = false;
      let quoteSubtotalHt: number | null = null;
      let quoteTotalTva: number | null = null;
      let quoteTotalTtc: number | null = null;
      let quoteDescription: string | null = null;
      
      // Company ID pour l'insertion des invoice_lines (initialisé plus tard si nécessaire)
      let companyId: string | null = null;
      
      // Toujours générer un numéro de facture (format FACTURE-YYYY-XXX)
      invoiceNumber = await generateInvoiceNumber(user.id);
      console.log("📄 Numéro de facture généré:", invoiceNumber);
      
      if (data.quote_id) {
        console.log("🔄 [useCreateInvoice] Récupération du devis:", data.quote_id);
        
        // Récupérer company_id pour filtrer le devis (multi-tenant)
        const currentCompanyId = await getCurrentCompanyId(user.id);
        
        // 🎯 ÉTAPE 1: Charger le devis complet avec ses totaux
        let quoteQuery = supabase
          .from("ai_quotes")
          .select("id, client_id, client_name, company_id, tva_rate, tva_non_applicable_293b, subtotal_ht, total_tva, total_ttc, mode, estimated_cost")
          .eq("id", data.quote_id);
        
        // Filtrer par company_id si disponible (multi-tenant)
        if (currentCompanyId) {
          quoteQuery = quoteQuery.eq("company_id", currentCompanyId);
        }
        
        const { data: quote, error: quoteError } = await quoteQuery.maybeSingle();
        
        if (quoteError) {
          console.error("❌ [useCreateInvoice] Erreur récupération devis:", quoteError);
        } else if (quote) {
          // Stocker les données du devis pour utilisation ultérieure
          quoteData = quote;
          quoteTvaRate = quote.tva_rate || 0.20;
          quoteTva293b = quote.tva_non_applicable_293b || false;
          quoteSubtotalHt = quote.subtotal_ht || null;
          quoteTotalTva = quote.total_tva || null;
          quoteTotalTtc = quote.total_ttc || null;
          
          // Copier client_id et client_name depuis le devis si non fournis
          if (!data.client_id && quote.client_id) {
            data.client_id = quote.client_id;
          }
          if (!data.client_name && quote.client_name) {
            data.client_name = quote.client_name;
          }
          
          // Récupérer description depuis details JSONB si disponible
          if (quote.details && typeof quote.details === 'object') {
            quoteDescription = (quote.details as any).description || null;
          }
          
          console.log("✅ [useCreateInvoice] Devis chargé:", {
            mode: quote.mode,
            tva_rate: quoteTvaRate,
            tva_293b: quoteTva293b,
            subtotal_ht: quoteSubtotalHt,
            total_ttc: quoteTotalTtc,
            estimated_cost: quote.estimated_cost
          });
          
          // 🎯 ÉTAPE 2: Charger les lignes du devis
          // Initialiser companyId depuis le devis ou le récupérer
          companyId = quote.company_id || await getCurrentCompanyId(user.id);
          console.log("🏢 [useCreateInvoice] Company ID utilisé:", companyId, "depuis quote.company_id:", quote.company_id);
          
          if (companyId) {
            try {
              // Récupérer les sections (pour devis détaillé)
              const { data: sections, error: sectionsError } = await supabase
                .from("quote_sections")
                .select("*")
                .eq("quote_id", data.quote_id)
                .eq("company_id", companyId)
                .order("position", { ascending: true });
              
              if (!sectionsError && sections) {
                quoteSections = sections;
                console.log("📋 [useCreateInvoice] Sections récupérées:", quoteSections.length);
              } else if (sectionsError) {
                console.warn("⚠️ [useCreateInvoice] Erreur récupération sections:", sectionsError.message);
              }
              
              // Récupérer les lignes (CRITIQUE pour transférer les prestations)
              const { data: lines, error: linesError } = await supabase
                .from("quote_lines")
                .select("*")
                .eq("quote_id", data.quote_id)
                .eq("company_id", companyId)
                .order("section_id", { ascending: true, nullsFirst: true })
                .order("position", { ascending: true });
              
              console.log("🔍 [useCreateInvoice] Requête lignes - quote_id:", data.quote_id, "company_id:", companyId);
              
              if (!linesError && lines) {
                quoteLines = lines;
                console.log("✅ [useCreateInvoice] Lignes récupérées:", quoteLines.length, quoteLines);
              } else if (linesError) {
                console.error("❌ [useCreateInvoice] Erreur récupération lignes:", linesError.message, linesError);
              } else {
                console.warn("⚠️ [useCreateInvoice] Aucune ligne retournée pour quote_id:", data.quote_id);
              }
            } catch (error: any) {
              console.error("❌ [useCreateInvoice] Exception récupération sections/lignes:", error?.message, error);
            }
          } else {
            console.warn("⚠️ [useCreateInvoice] Aucun company_id disponible, impossible de charger les lignes");
          }
        }
      }

      // 🎯 ÉTAPE C: Convertir les lignes du devis en service_lines
      const normalizedServiceLines = Array.isArray(data.service_lines) ? data.service_lines : [];
      let serviceLines: Array<{ description: string; quantity: number; unit_price: number; total?: number }> = normalizedServiceLines;
      
      if (quoteLines.length > 0 && serviceLines.length === 0) {
        // Convertir les lignes du devis détaillé en service_lines
        serviceLines = quoteLines.map((line) => {
          const quantity = line.quantity || 1;
          const unitPrice = line.unit_price_ht || 0;
          const total = quantity * unitPrice;
          
          return {
            description: line.label || line.description || "",
            quantity: quantity,
            unit_price: unitPrice,
            total: total
          };
        });
        console.log("📋 [useCreateInvoice] Service lines créées depuis quote_lines:", serviceLines.length);
      } else if (quoteLines.length === 0 && quoteData) {
        // Devis simple (pas de quote_lines) : créer une ligne depuis les totaux du devis
        // Priorité: subtotal_ht > estimated_cost > total_ttc (si pas de TVA)
        const montantHT = quoteSubtotalHt !== null && quoteSubtotalHt > 0 
          ? quoteSubtotalHt 
          : (quoteData.estimated_cost && quoteData.estimated_cost > 0 
              ? quoteData.estimated_cost 
              : (quoteTva293b && quoteTotalTtc ? quoteTotalTtc : null));
        
        if (montantHT && montantHT > 0) {
          serviceLines = [{
            description: quoteDescription || data.description || `Facture pour ${data.client_name || 'client'}`,
            quantity: 1,
            unit_price: montantHT,
            total: montantHT
          }];
          console.log("📋 [useCreateInvoice] Ligne créée depuis devis simple (montant HT):", montantHT);
        } else {
          console.warn("⚠️ [useCreateInvoice] Aucun montant valide trouvé dans le devis pour créer une ligne");
        }
      }
      
      // ✅ PROTECTION FINALE: Garantir que serviceLines est toujours un tableau
      if (!Array.isArray(serviceLines)) {
        console.warn("⚠️ [useCreateInvoice] serviceLines n'est pas un tableau, conversion...");
        serviceLines = [];
      }

      // 🎯 ÉTAPE D: Calculer les totaux (priorité: service_lines > quote totals > data.amount_ht)
      // Les valeurs quoteTvaRate, quoteTva293b, quoteSubtotalHt sont déjà récupérées plus haut
      
      // Taux TVA: devis > data > 20%
      // ✅ CORRECTION: quoteTvaRate est en décimal (0.20 = 20%), donc multiplier par 100 pour obtenir le pourcentage
      // Si quoteTvaRate est NULL ou invalide, utiliser data.vat_rate (en %) ou 20% par défaut
      let vatRatePercent = 20; // Par défaut 20%
      if (quoteTva293b) {
        vatRatePercent = 0; // TVA non applicable
        console.log("💰 [useCreateInvoice] TVA 293B activée → taux = 0%");
      } else if (quoteTvaRate !== null && quoteTvaRate > 0) {
        // quoteTvaRate est en décimal (ex: 0.20 pour 20%), multiplier par 100 pour obtenir le pourcentage
        vatRatePercent = quoteTvaRate * 100;
        // Protection: si le taux calculé est trop bas (< 1%), c'est suspect (probablement une erreur)
        if (vatRatePercent < 1) {
          console.warn("⚠️ [useCreateInvoice] Taux TVA suspect du devis:", quoteTvaRate, "→", vatRatePercent, "% - utilisation de 20% par défaut");
          vatRatePercent = 20; // Forcer à 20% par défaut si le taux est suspect
        }
        console.log("💰 [useCreateInvoice] Taux TVA depuis devis:", quoteTvaRate, "→", vatRatePercent, "%");
      } else if (data.vat_rate && data.vat_rate > 0) {
        // data.vat_rate est déjà en pourcentage (ex: 20 pour 20%)
        vatRatePercent = data.vat_rate;
        console.log("💰 [useCreateInvoice] Taux TVA depuis data.vat_rate:", vatRatePercent, "%");
      } else {
        console.log("💰 [useCreateInvoice] Taux TVA par défaut: 20%");
      }
      const vatRateDecimal = vatRatePercent / 100;
      console.log("💰 [useCreateInvoice] Taux TVA final:", { vatRatePercent: `${vatRatePercent}%`, vatRateDecimal });
      
      // ✅ CORRECTION: Calculer totalHt: service_lines > quote subtotal_ht > data.amount_ht
      // IMPORTANT: Si data.amount_ttc est fourni, l'utiliser comme source de vérité (évite les arrondis)
      let totalHt = 0;
      let montantTTCRecu = data.amount_ttc || null; // ✅ TTC saisi directement (source de vérité)
      
      if (serviceLines.length > 0) {
        totalHt = serviceLines.reduce((sum, line) => {
          const lineTotal = (line.quantity || 1) * (line.unit_price || 0);
          return sum + lineTotal;
        }, 0);
        console.log("💰 [useCreateInvoice] Total HT calculé depuis service_lines:", totalHt);
      } else if (quoteSubtotalHt !== null && quoteSubtotalHt > 0) {
        totalHt = quoteSubtotalHt;
        console.log("💰 [useCreateInvoice] Total HT récupéré du devis:", totalHt);
      } else if (data.amount_ht && data.amount_ht > 0) {
        // ✅ data.amount_ht est déjà en HT (calculé depuis TTC dans SimpleInvoiceForm)
        totalHt = data.amount_ht;
        console.log("💰 [useCreateInvoice] Total HT depuis data.amount_ht (déjà en HT):", totalHt);
        
        // ✅ Si on a le TTC directement, l'utiliser (évite les arrondis)
        if (montantTTCRecu && montantTTCRecu > 0) {
          console.log("💰 [useCreateInvoice] TTC fourni directement (source de vérité):", montantTTCRecu);
        } else if (data.vat_rate !== undefined) {
          // Sinon, recalculer le TTC à partir du HT
          const vatRateDec = data.vat_rate / 100;
          montantTTCRecu = totalHt * (1 + vatRateDec);
          console.log("💰 [useCreateInvoice] TTC recalculé depuis HT:", montantTTCRecu, "avec TVA", data.vat_rate, "%");
        }
      }
      
      // Avertissement si totalHt = 0
      if (totalHt <= 0) {
        console.warn("⚠️ [useCreateInvoice] ATTENTION: totalHt = 0. Le devis a-t-il des lignes?");
      }

      // ✅ CORRECTION: Calculer TVA et TTC (respecter 293B si applicable)
      // IMPORTANT: Si on a un montantTTC reçu depuis SimpleInvoiceForm, l'utiliser directement (évite les arrondis)
      let finalVatAmount = 0;
      let finalAmountTtc = totalHt;
      
      if (quoteTva293b || vatRatePercent === 0) {
        // TVA non applicable article 293B → TVA = 0, TTC = HT
        finalVatAmount = 0;
        finalAmountTtc = totalHt;
        console.log("💰 [useCreateInvoice] TVA 293B appliquée → TVA = 0, TTC = HT:", finalAmountTtc);
      } else if (montantTTCRecu && montantTTCRecu > 0) {
        // ✅ PRIORITÉ: Utiliser le TTC fourni directement (source de vérité, évite les arrondis)
        // Le TTC est ce que l'utilisateur a saisi exactement
        finalAmountTtc = Math.round(montantTTCRecu * 100) / 100;
        // Recalculer le HT depuis le TTC pour être cohérent
        if (vatRateDecimal > 0) {
          const htFromTtc = finalAmountTtc / (1 + vatRateDecimal);
          totalHt = Math.round(htFromTtc * 100) / 100;
          finalVatAmount = Math.round((finalAmountTtc - totalHt) * 100) / 100;
        } else {
          finalVatAmount = 0;
        }
        console.log("💰 [useCreateInvoice] Utilisation du TTC fourni (source de vérité):", finalAmountTtc, "HT:", totalHt, "TVA:", finalVatAmount);
      } else {
        // Fallback: TVA normale : recalculer depuis HT
        finalVatAmount = Math.round((totalHt * vatRateDecimal) * 100) / 100;
        finalAmountTtc = Math.round((totalHt + finalVatAmount) * 100) / 100;
        console.log("💰 [useCreateInvoice] TVA normale → HT:", totalHt, "TVA:", finalVatAmount, "TTC:", finalAmountTtc);
      }
      
      console.log("💰 [useCreateInvoice] Totaux finaux:", { 
        totalHt, 
        vatRate: `${vatRatePercent}%`, 
        finalVatAmount, 
        finalAmountTtc,
        montantTTCRecu,
        serviceLinesCount: serviceLines.length,
        quoteLinesCount: quoteLines.length,
        dataAmountHt: data.amount_ht,
        dataVatRate: data.vat_rate
      });

      // Récupérer company_id si pas déjà défini (depuis quote ou user)
      if (!companyId) {
        companyId = await getCurrentCompanyId(user.id);
      }
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise pour créer une facture");
      }

      // Préparer les données d'insertion
      // Commencer avec SEULEMENT les colonnes de base qui existent TOUJOURS
      // D'après le schéma, la table de base a: id, user_id, company_id, client_id, quote_id, invoice_number, amount (NOT NULL), status, due_date, paid_date, created_at, updated_at
      // ⚠️ SÉCURITÉ : Ne JAMAIS envoyer company_id - le trigger backend le force depuis JWT
      const insertData: any = {
        user_id: user.id,
        // company_id: IGNORÉ volontairement - le trigger backend le force depuis JWT
        invoice_number: invoiceNumber,
        status: "draft",
        amount: finalAmountTtc || 0, // NOT NULL, obligatoire dans le schéma de base
      };

      // Ajouter les colonnes de base optionnelles (elles existent dans le schéma de base)
      if (data.client_id) insertData.client_id = data.client_id;
      if (data.quote_id) insertData.quote_id = data.quote_id;
      if (data.due_date) insertData.due_date = data.due_date;

      // Insérer avec select("id") seulement pour éviter les erreurs si d'autres colonnes n'existent pas
      let invoice: any = null;
      let insertError: any = null;

      // Essayer d'abord avec le payload de base uniquement (sans colonnes optionnelles qui pourraient ne pas exister)
      let result = await supabase
        .from("invoices")
        .insert(insertData)
        .select("id")
        .single();

      invoice = result.data;
      insertError = result.error;

      // Si insertion réussie, mettre à jour avec les colonnes optionnelles
      if (!insertError && invoice?.id) {
        const updateData: any = {};
        
        if (data.client_name) updateData.client_name = data.client_name;
        if (data.client_email) updateData.client_email = data.client_email;
        // ✅ client_address, description n'existent pas dans la table - ignorés
        // ✅ service_lines : stocker dans la table invoice_lines (table séparée)
        
        // ✅ CORRECTION P0: Utiliser les colonnes réelles de la DB (total_ht, total_ttc, tva)
        // D'après ADD-PAYMENT-FLOW-COLUMNS.sql, la table a: total_ht, total_ttc, tva (pas amount_ht, amount_ttc, vat_amount)
        if (totalHt > 0) {
          updateData.total_ht = totalHt;
        }
        if (finalAmountTtc > 0) {
          updateData.total_ttc = finalAmountTtc;
          // Mettre à jour aussi 'amount' qui est NOT NULL dans le schéma de base
          updateData.amount = finalAmountTtc;
        }
        if (finalVatAmount > 0 || quoteTva293b) {
          updateData.tva = finalVatAmount;
        }
        
        // ✅ STOCKER LES SERVICE_LINES dans invoice_lines si disponibles
        if (serviceLines.length > 0 && invoice?.id) {
          // Récupérer companyId si pas déjà défini (depuis quote, invoice ou user)
          // Si companyId n'a pas été initialisé (pas de quote_id), le récupérer maintenant
          if (!companyId) {
            companyId = (invoice as any).company_id || await getCurrentCompanyId(user.id);
          }
          const finalCompanyId = companyId;
          
          if (finalCompanyId) {
            try {
              // Supprimer les anciennes lignes si elles existent (au cas où)
              await supabase
                .from("invoice_lines")
                .delete()
                .eq("invoice_id", invoice.id);
              
              // Insérer les nouvelles lignes
              const invoiceLinesToInsert = serviceLines.map((line, index) => {
                const quantity = line.quantity || 1;
                const unitPrice = line.unit_price || 0;
                const lineTotalHT = line.total || (quantity * unitPrice);
                const lineTvaRate = quoteTva293b ? 0 : (vatRateDecimal || 0.20);
                const lineTva = lineTvaRate > 0 ? Math.round((lineTotalHT * lineTvaRate) * 100) / 100 : 0;
                const lineTotalTTC = Math.round((lineTotalHT + lineTva) * 100) / 100;
                
                return {
                  invoice_id: invoice.id,
                  // company_id: IGNORÉ volontairement - le trigger backend le force depuis JWT
                  position: index,
                  label: line.description || "",
                  description: line.description || "",
                  unit: "u",
                  quantity: quantity,
                  unit_price_ht: unitPrice,
                  total_ht: lineTotalHT,
                  tva_rate: lineTvaRate,
                  total_tva: lineTva,
                  total_ttc: lineTotalTTC,
                };
              });
              
              const { error: linesError } = await supabase
                .from("invoice_lines")
                .insert(invoiceLinesToInsert);
              
              if (linesError) {
                console.error("❌ [useCreateInvoice] Erreur insertion invoice_lines:", linesError);
              } else {
                console.log("✅ [useCreateInvoice] Invoice lines insérées:", invoiceLinesToInsert.length);
              }
            } catch (linesError: any) {
              console.error("❌ [useCreateInvoice] Exception insertion invoice_lines:", linesError?.message);
            }
          } else {
            console.warn("⚠️ [useCreateInvoice] Pas de company_id disponible pour insérer invoice_lines");
          }
        }
        
        // Optionnel: Ajouter vat_rate si la colonne existe (mais ne pas bloquer si elle n'existe pas)
        // Note: vat_rate n'est pas dans ADD-PAYMENT-FLOW-COLUMNS.sql, donc on ne l'ajoute pas pour éviter les erreurs

        if (Object.keys(updateData).length > 0) {
          console.log("📝 [useCreateInvoice] Update après création:", updateData);
          
          // Essayer de mettre à jour avec les colonnes réelles
          const updateResult = await supabase
            .from("invoices")
            .update(updateData)
            .eq("id", invoice.id)
            .select("id, total_ht, total_ttc, tva, amount")
            .single();
          
          if (updateResult.error) {
            // ✅ LOG COMPLET DE L'ERREUR (P0)
            console.error("❌ [useCreateInvoice] Erreur update invoices:", {
              code: updateResult.error?.code,
              message: updateResult.error?.message,
              details: updateResult.error?.details,
              hint: updateResult.error?.hint,
              updateData: updateData,
              invoiceId: invoice.id
            });
            
            // Si c'est une erreur de colonne manquante, continuer quand même (l'insertion a réussi)
            if (updateResult.error.code === "42703" || updateResult.error.code === "PGRST204" || updateResult.error.message?.includes("column") || updateResult.error.message?.includes("Could not find")) {
              console.warn("⚠️ Colonne manquante dans update (ignorée):", updateResult.error.message);
            } else {
              // Autre erreur (400, etc.) - ne pas ignorer, logger pour diagnostic
              console.error("❌ Erreur update non liée à colonne manquante:", updateResult.error);
            }
          } else if (updateResult.data) {
            console.log("✅ [useCreateInvoice] Update réussi:", updateResult.data);
            // Mettre à jour invoice avec les données retournées
            invoice = { ...invoice, ...updateResult.data };
          }
        }

        // ✅ CORRECTION P0: Récupérer la facture avec uniquement les colonnes qui existent réellement
        // ✅ Récupérer aussi les invoice_lines (lignes détaillées)
        const fetchResult = await supabase
          .from("invoices")
          .select(`
            id, user_id, company_id, client_id, quote_id, invoice_number, status, 
            amount, due_date, paid_date, created_at, updated_at,
            client_name, client_email,
            total_ht, total_ttc, tva,
            invoice_lines (
              id, invoice_id, position, label, description, unit,
              quantity, unit_price_ht, total_ht, tva_rate, total_tva, total_ttc
            )
          `)
          .eq("id", invoice.id)
          .single();
        
        if (fetchResult.data) {
          invoice = fetchResult.data as any;
          // Convertir invoice_lines en service_lines pour compatibilité
          if (invoice.invoice_lines && Array.isArray(invoice.invoice_lines)) {
            (invoice as any).service_lines = invoice.invoice_lines
              .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
              .map((line: any) => ({
                description: line.label || line.description || "",
                quantity: line.quantity || 1,
                unit_price: line.unit_price_ht || 0,
                total: line.total_ht || (line.quantity * line.unit_price_ht) || 0,
              }));
          }
          console.log("✅ [useCreateInvoice] Facture récupérée avec succès:", {
            id: invoice.id,
            total_ht: invoice.total_ht,
            total_ttc: invoice.total_ttc,
            tva: invoice.tva,
            amount: invoice.amount,
            service_lines_count: invoice.service_lines?.length || 0
          });
        } else if (fetchResult.error) {
          // ✅ LOG COMPLET DE L'ERREUR (P0)
          console.error("❌ [useCreateInvoice] Erreur fetch invoices:", {
            code: fetchResult.error?.code,
            message: fetchResult.error?.message,
            details: fetchResult.error?.details,
            hint: fetchResult.error?.hint,
            invoiceId: invoice.id
          });
          
          // Fallback: Récupérer avec les colonnes de base seulement
          const minimalFetch = await supabase
            .from("invoices")
            .select("id, user_id, invoice_number, status, amount, client_id, quote_id, created_at, updated_at")
            .eq("id", invoice.id)
            .single();
          
          if (minimalFetch.data) {
            invoice = minimalFetch.data as any;
            console.log("⚠️ [useCreateInvoice] Facture récupérée avec colonnes minimales seulement");
          } else if (minimalFetch.error) {
            console.error("❌ [useCreateInvoice] Même le fetch minimal a échoué:", minimalFetch.error);
          }
        }
      } else if (insertError && (insertError.code === "42703" || insertError.code === "PGRST204" || insertError.message?.includes("column") || insertError.message?.includes("Could not find"))) {
        console.warn("⚠️ Colonnes manquantes détectées, réessai avec payload minimal:", insertError);
        
        // Payload minimal avec SEULEMENT les colonnes de base qui existent TOUJOURS
        // D'après le schéma ADD-PAYMENT-FLOW-COLUMNS.sql, la table de base a:
        // id, user_id, company_id, client_id, quote_id, invoice_number, amount (NOT NULL), status, due_date, paid_date, created_at, updated_at
        const minimalInsert: any = {
          user_id: user.id,
          invoice_number: invoiceNumber,
          status: "draft",
          amount: finalAmountTtc || 0, // NOT NULL, obligatoire
        };
        
        // Ajouter client_id seulement si fourni (colonne de base)
        if (data.client_id) minimalInsert.client_id = data.client_id;
        
        // Les colonnes client_name, client_email, client_address, description sont ajoutées après
        // Ne pas les inclure dans le payload minimal pour éviter les erreurs

        // Essayer d'abord sans select pour voir si l'insertion fonctionne
        const insertOnlyResult = await supabase
          .from("invoices")
          .insert(minimalInsert)
          .select("id")
          .single();
        
        if (insertOnlyResult.error) {
          console.error("❌ Erreur même avec payload minimal:", insertOnlyResult.error);
          console.error("📋 Payload minimal envoyé:", minimalInsert);
          // Afficher l'erreur complète pour diagnostic
          throw new Error(`Erreur création facture: ${insertOnlyResult.error.message || JSON.stringify(insertOnlyResult.error)}`);
        }
        
        // Si l'insertion a réussi, récupérer la facture complète
        if (insertOnlyResult.data?.id) {
          const fetchResult = await supabase
            .from("invoices")
            .select("*")
            .eq("id", insertOnlyResult.data.id)
            .single();
          
          if (fetchResult.data) {
            invoice = fetchResult.data;
            insertError = null;
          } else {
            // Au moins on a l'ID, créer un objet minimal
            invoice = insertOnlyResult.data as any;
            insertError = null;
          }
        } else {
          throw new Error("La facture n'a pas été créée (pas d'ID retourné)");
        }
      }

      if (insertError) {
        console.error("❌ Erreur création facture:", insertError);
        throw insertError;
      }

      if (!invoice) {
        throw new Error("La facture n'a pas été créée");
      }
      // ✅ NORMALISER l'invoice retourné pour compatibilité
      return normalizeInvoice(invoice) as Invoice;
    },
    onSuccess: async (invoice) => {
      // ✅ CORRECTION: Ajouter la facture créée au cache SANS invalider complètement
      // Cela évite de recharger toutes les factures depuis le serveur (y compris celles supprimées)
      const normalizedInvoice = normalizeInvoice(invoice);
      
      // ✅ Préserver la liste des factures supprimées lors de la mise à jour du cache
      const deletedInvoicesSet = queryClient.getQueryData<Set<string>>(["deleted_invoices"]) || new Set<string>();
      
      // Mettre à jour toutes les variantes de la query ["invoices"]
      const queryKeysToUpdate = [
        ["invoices", user?.id, fakeDataEnabled],
        ["invoices", user?.id, true],
        ["invoices", user?.id, false],
        ["invoices", user?.id],
        ["invoices"],
      ];
      
      // ✅ S'ASSURER que la nouvelle facture n'est pas dans deletedSet (si elle y est, la retirer)
      if (deletedInvoicesSet.has(invoice.id)) {
        console.warn("⚠️ [useCreateInvoice] La nouvelle facture est dans deletedSet, nettoyage...");
        deletedInvoicesSet.delete(invoice.id);
        queryClient.setQueryData(["deleted_invoices"], deletedInvoicesSet);
      }
      
      queryKeysToUpdate.forEach(queryKey => {
        queryClient.setQueryData(queryKey, (old: Invoice[] | undefined) => {
          if (!old) return [normalizedInvoice];
          
          // ✅ Filtrer les factures supprimées AVANT d'ajouter la nouvelle
          const filtered = old.filter((inv) => !deletedInvoicesSet.has(inv.id));
          
          // Vérifier si la nouvelle facture n'existe pas déjà (éviter les doublons)
          if (filtered.some((inv) => inv.id === invoice.id)) {
            return filtered.map((inv) => (inv.id === invoice.id ? normalizedInvoice : inv));
          }
          
          // Ajouter en tête (plus récentes en premier)
          return [normalizedInvoice, ...filtered];
        });
      });
      
      console.log("✅ [useCreateInvoice] Facture ajoutée au cache (sans invalidation complète pour préserver le filtre des supprimées)");
      
      // ✅ NOTE: Le téléchargement PDF n'est plus automatique
      // L'utilisateur doit cliquer sur le bouton "Télécharger PDF" pour télécharger
      // Un aperçu de la facture sera affiché automatiquement dans le dialog
      
      // ✅ CORRECTION P1: Neutraliser user_settings 400 (ne doit pas bloquer)
      // Vérifier si l'envoi automatique est activé (dans un try/catch pour ne pas bloquer)
      try {
        const { data: settings, error: settingsError } = await supabase
          .from("user_settings")
          .select("auto_send_email")
          .eq("user_id", user?.id)
          .maybeSingle();

        // Si erreur (400, etc.), ignorer et continuer (fallback: auto_send_email = false)
        if (settingsError) {
          console.warn("⚠️ [useCreateInvoice] Erreur récupération user_settings (ignorée):", {
            code: settingsError?.code,
            message: settingsError?.message,
            details: settingsError?.details
          });
          // Fallback: ne pas envoyer automatiquement
        } else if (settings?.auto_send_email && invoice.client_email) {
          // Envoyer automatiquement la facture par email
          try {
            const { sendInvoiceEmail } = await import("@/services/emailService");
            await sendInvoiceEmail({
              to: invoice.client_email,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoice_number,
              clientName: invoice.client_name || "Client",
            });
            
            // Mettre à jour le statut
            await supabase
              .from("invoices")
              .update({ status: "sent", email_sent_at: new Date().toISOString() })
              .eq("id", invoice.id);

            toast({
              title: "Facture créée et envoyée",
              description: `La facture a été créée et envoyée automatiquement à ${invoice.client_email}`,
            });
          } catch (emailError: any) {
            console.error("Erreur envoi automatique facture:", emailError);
            toast({
              title: "Facture créée",
              description: "La facture a été créée, mais l'envoi automatique a échoué.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Facture créée",
            description: "La facture a été créée avec succès.",
          });
        }
      } catch (error) {
        // ✅ P1: Ne pas bloquer si user_settings échoue
        console.warn("⚠️ [useCreateInvoice] Exception lors vérification auto_send_email (ignorée):", error);
        toast({
          title: "Facture créée",
          description: "La facture a été créée avec succès.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la facture",
        variant: "destructive",
      });
    },
  });
};

// Hook pour mettre à jour une facture
export const useUpdateInvoice = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateInvoiceData) => {
      if (!user) throw new Error("User not authenticated");

      const updateData: any = { ...data };
      delete updateData.id;

      // ✅ CORRECTION P0: Utiliser les colonnes réelles (total_ht, total_ttc, tva)
      // Recalculer les montants si total_ht change
      if (updateData.total_ht !== undefined || updateData.amount_ht !== undefined) {
        // Récupérer les données actuelles avec les colonnes réelles
        const { data: currentInvoiceData, error: fetchError } = await supabase
          .from("invoices")
          .select("total_ht, total_ttc, tva, amount")
          .eq("id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();

        // ✅ LOG COMPLET SI ERREUR (P0)
        if (fetchError) {
          console.error("❌ [useUpdateInvoice] Erreur fetch invoices:", {
            code: fetchError?.code,
            message: fetchError?.message,
            details: fetchError?.details,
            hint: fetchError?.hint,
            invoiceId: data.id
          });
        }

        // Utiliser total_ht (colonne réelle) ou amount_ht (legacy/compatibilité)
        const totalHt = updateData.total_ht ?? updateData.amount_ht ?? currentInvoiceData?.total_ht ?? currentInvoiceData?.amount_ht ?? 0;
        
        // Calculer TVA (par défaut 20% si pas de TVA dans les données)
        const tvaAmount = currentInvoiceData?.tva ?? 0;
        const totalTtc = currentInvoiceData?.total_ttc ?? currentInvoiceData?.amount ?? 0;
        
        // Si total_ht change, recalculer TVA et TTC (simplifié, utiliser le taux existant)
        if (totalHt > 0 && totalTtc > 0) {
          const estimatedVatRate = totalTtc > totalHt ? ((totalTtc - totalHt) / totalHt) * 100 : 20;
          const newTvaAmount = Math.round((totalHt * estimatedVatRate / 100) * 100) / 100;
          const newTotalTtc = totalHt + newTvaAmount;

          updateData.total_ht = totalHt;
          updateData.tva = newTvaAmount;
          updateData.total_ttc = newTotalTtc;
          updateData.amount = newTotalTtc; // Mettre à jour aussi 'amount' qui est NOT NULL
        }
      }

      const { data: invoice, error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", data.id)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (error) throw error;
      // ✅ NORMALISER l'invoice retourné pour compatibilité
      return normalizeInvoice(invoice) as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Facture mise à jour",
        description: "La facture a été mise à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la facture",
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer une facture
export const useDeleteInvoice = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Attendre un peu pour s'assurer que la suppression est complète
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onSuccess: async (_, deletedInvoiceId: string) => {
      console.log("🔄 [useDeleteInvoice] Suppression de la facture:", deletedInvoiceId);
      
      // ✅ ÉTAPE 1: Ajouter l'ID à la liste des factures supprimées (pour filtre permanent)
      const deletedSet = queryClient.getQueryData<Set<string>>(["deleted_invoices"]) || new Set<string>();
      deletedSet.add(deletedInvoiceId);
      queryClient.setQueryData(["deleted_invoices"], deletedSet);
      console.log("📝 [useDeleteInvoice] ID ajouté à la liste des supprimées:", deletedInvoiceId);
      
      // ✅ ÉTAPE 2: SUPPRESSION IMMÉDIATE DU CACHE - Mise à jour optimiste
      // Mettre à jour toutes les variantes de la query ["invoices"]
      const queryKeysToUpdate = [
        ["invoices", user?.id, fakeDataEnabled],
        ["invoices", user?.id, true],
        ["invoices", user?.id, false],
        ["invoices"],
      ];
      
      queryKeysToUpdate.forEach(queryKey => {
        queryClient.setQueriesData(
          { queryKey, exact: false }, 
          (oldData: Invoice[] | undefined | any) => {
            // Vérifier que oldData est un tableau valide
            if (!oldData || !Array.isArray(oldData)) {
              return oldData;
            }
            // Filtrer la facture supprimée
            const filtered = oldData.filter((inv: Invoice) => inv?.id !== deletedInvoiceId);
            if (filtered.length !== oldData.length) {
              console.log("🗑️ [useDeleteInvoice] Cache mis à jour pour", queryKey, "- Avant:", oldData.length, "Après:", filtered.length);
            }
            return filtered;
          }
        );
      });
      
      // ✅ ÉTAPE 3: Invalider toutes les queries invoices (sans refetch automatique)
      queryClient.invalidateQueries({ queryKey: ["invoices"], exact: false, refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["invoice", deletedInvoiceId], exact: false, refetchType: "none" });
      
      // ✅ ÉTAPE 4: Supprimer explicitement la query de la facture supprimée
      queryClient.removeQueries({ queryKey: ["invoice", deletedInvoiceId], exact: false });
      
      // ✅ ÉTAPE 5: Nettoyage final après un délai pour s'assurer que le polling ne les recharge pas
      setTimeout(() => {
        // Vérifier une dernière fois que la facture n'est plus dans le cache
        const allInvoicesQueries = queryClient.getQueriesData({ queryKey: ["invoices"], exact: false });
        allInvoicesQueries.forEach(([queryKey, data]) => {
          if (data && Array.isArray(data)) {
            const hasDeleted = (data as Invoice[]).some((inv: Invoice) => inv?.id === deletedInvoiceId);
            if (hasDeleted) {
              console.warn("⚠️ [useDeleteInvoice] Facture encore présente dans le cache, nettoyage forcé...");
              queryClient.setQueryData(queryKey, (data as Invoice[]).filter((inv: Invoice) => inv?.id !== deletedInvoiceId));
            }
          }
        });
        
        // Réinvalider une dernière fois sans refetch
        queryClient.invalidateQueries({ queryKey: ["invoices"], exact: false, refetchType: "none" });
        queryClient.removeQueries({ queryKey: ["invoice", deletedInvoiceId], exact: false });
      }, 1000);
      
      console.log("✅ [useDeleteInvoice] Facture supprimée définitivement du cache");
      toast({
        title: "Facture supprimée",
        description: "La facture a été supprimée définitivement.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la facture",
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer plusieurs factures en masse
export const useDeleteInvoicesBulk = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fakeDataEnabled } = useFakeDataStore();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error("User not authenticated");
      if (ids.length === 0) return;

      console.log("🗑️ [useDeleteInvoicesBulk] Début suppression de", ids.length, "factures:", ids);

      const { error } = await supabase
        .from("invoices")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ [useDeleteInvoicesBulk] Erreur suppression DB:", error);
        throw error;
      }
      
      console.log("✅ [useDeleteInvoicesBulk] Suppression DB réussie, attente confirmation...");
      
      // Attendre plus longtemps pour s'assurer que la suppression est complète côté serveur
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Vérifier que les factures sont bien supprimées
      const { data: remainingInvoices, error: checkError } = await supabase
        .from("invoices")
        .select("id")
        .in("id", ids)
        .eq("user_id", user.id);
      
      if (checkError) {
        console.warn("⚠️ [useDeleteInvoicesBulk] Impossible de vérifier la suppression:", checkError);
      } else if (remainingInvoices && remainingInvoices.length > 0) {
        console.warn("⚠️ [useDeleteInvoicesBulk] Certaines factures n'ont pas été supprimées:", remainingInvoices);
      } else {
        console.log("✅ [useDeleteInvoicesBulk] Toutes les factures confirmées supprimées");
      }
    },
    onSuccess: async (_, deletedInvoiceIds: string[]) => {
      console.log("🔄 [useDeleteInvoicesBulk] Mise à jour du cache après suppression de", deletedInvoiceIds.length, "factures");
      
      // ✅ ÉTAPE 1: Ajouter tous les IDs à la liste des factures supprimées (pour filtre permanent)
      const deletedSet = queryClient.getQueryData<Set<string>>(["deleted_invoices"]) || new Set<string>();
      deletedInvoiceIds.forEach(id => deletedSet.add(id));
      queryClient.setQueryData(["deleted_invoices"], deletedSet);
      console.log("📝 [useDeleteInvoicesBulk] IDs ajoutés à la liste des supprimées:", deletedInvoiceIds.length);
      
      // ✅ ÉTAPE 2: Supprimer explicitement toutes les queries individuelles d'abord
      deletedInvoiceIds.forEach(id => {
        queryClient.removeQueries({ queryKey: ["invoice", id], exact: false });
        queryClient.removeQueries({ queryKey: ["invoices", id], exact: false });
      });
      
      // ✅ ÉTAPE 3: Mettre à jour le cache pour supprimer toutes les factures supprimées
      const queryKeysToUpdate = [
        ["invoices", user?.id, fakeDataEnabled],
        ["invoices", user?.id, true],
        ["invoices", user?.id, false],
        ["invoices"],
      ];
      
      queryKeysToUpdate.forEach(queryKey => {
        queryClient.setQueriesData(
          { queryKey, exact: false }, 
          (oldData: Invoice[] | undefined | any) => {
            if (!oldData || !Array.isArray(oldData)) {
              return oldData;
            }
            const beforeLength = oldData.length;
            const filtered = oldData.filter((inv: Invoice) => inv?.id && !deletedInvoiceIds.includes(inv.id));
            if (filtered.length !== beforeLength) {
              console.log("🗑️ [useDeleteInvoicesBulk] Cache mis à jour pour", queryKey, "- Avant:", beforeLength, "Après:", filtered.length);
            }
            return filtered;
          }
        );
      });
      
      // ✅ ÉTAPE 4: Invalider toutes les queries invoices SANS refetch
      queryClient.invalidateQueries({ 
        queryKey: ["invoices"], 
        exact: false, 
        refetchType: "none" 
      });
      
      // ✅ ÉTAPE 5: Nettoyage final après un délai pour s'assurer que le polling ne les recharge pas
      setTimeout(() => {
        // Vérifier une dernière fois que les factures ne sont plus dans le cache
        const allInvoicesQueries = queryClient.getQueriesData({ queryKey: ["invoices"], exact: false });
        allInvoicesQueries.forEach(([queryKey, data]) => {
          if (data && Array.isArray(data)) {
            const beforeLength = (data as Invoice[]).length;
            const filtered = (data as Invoice[]).filter((inv: Invoice) => inv?.id && !deletedInvoiceIds.includes(inv.id));
            if (filtered.length !== beforeLength) {
              console.warn("⚠️ [useDeleteInvoicesBulk] Factures encore présentes dans le cache, nettoyage forcé...", {
                queryKey,
                avant: beforeLength,
                après: filtered.length
              });
              queryClient.setQueryData(queryKey, filtered);
            }
          }
        });
        
        // Réinvalider une dernière fois sans refetch
        queryClient.invalidateQueries({ queryKey: ["invoices"], exact: false, refetchType: "none" });
        deletedInvoiceIds.forEach(id => {
          queryClient.removeQueries({ queryKey: ["invoice", id], exact: false });
        });
      }, 1000);
      
      toast({
        title: "Factures supprimées",
        description: `${deletedInvoiceIds.length} facture${deletedInvoiceIds.length > 1 ? 's' : ''} supprimée${deletedInvoiceIds.length > 1 ? 's' : ''} définitivement.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer les factures",
        variant: "destructive",
      });
    },
  });
};

// Hook pour mettre à jour le statut d'une facture
export const useUpdateInvoiceStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Invoice["status"] }) => {
      if (!user) throw new Error("User not authenticated");

      const updateData: any = { status };
      if (status === "paid") {
        updateData.paid_at = new Date().toISOString();
        updateData.payment_status = "paid";
      }

      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    },
  });
};



