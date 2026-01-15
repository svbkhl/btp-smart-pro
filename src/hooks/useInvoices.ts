import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_INVOICES } from "@/fakeData/invoices";
import { generateInvoiceNumber } from "@/utils/documentNumbering";
import { useFakeDataStore } from "@/store/useFakeDataStore";

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
  amount_ht: number;
  amount_ttc: number;
  vat_rate: number;
  vat_amount: number;
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
  amount_ht: number;
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

          const { data, error } = await supabase
            .from("invoices")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) throw error;
          return (data || []) as Invoice[];
        },
        [],
        "useInvoices"
      );
    },
    enabled: !!user || fakeDataEnabled,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: 60000, // Polling automatique toutes les 60s
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

          const { data, error } = await supabase
            .from("invoices")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!data) {
            throw new Error("Invoice not found");
          }

          if (error) throw error;
          return data as Invoice;
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

  return useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      if (!user) throw new Error("User not authenticated");

      // ⚠️ IMPORTANT: Si la facture est créée depuis un devis, utiliser le même numéro
      let invoiceNumber: string;
      if (data.quote_id) {
        // Récupérer le numéro du devis
        const { data: quote, error: quoteError } = await supabase
          .from("ai_quotes")
          .select("quote_number")
          .eq("id", data.quote_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (quoteError || !quote?.quote_number) {
          console.warn("⚠️ Impossible de récupérer le numéro du devis, génération d'un nouveau numéro");
          invoiceNumber = await generateInvoiceNumber(user.id);
        } else {
          // Utiliser le même numéro que le devis
          invoiceNumber = quote.quote_number;
          console.log("📄 Numéro de facture = numéro de devis:", invoiceNumber);
        }
      } else {
        // Générer un nouveau numéro de facture
        invoiceNumber = await generateInvoiceNumber(user.id);
        console.log("📄 Numéro de facture généré:", invoiceNumber);
      }

      // Calculer les montants
      const vatRate = data.vat_rate || 20;
      const vatAmount = (data.amount_ht * vatRate) / 100;
      const amountTtc = data.amount_ht + vatAmount;

      // Calculer les totaux depuis service_lines si présents
      let totalHt = data.amount_ht;
      if (data.service_lines && data.service_lines.length > 0) {
        totalHt = data.service_lines.reduce((sum, line) => {
          return sum + (line.quantity * line.unit_price);
        }, 0);
      }

      const finalVatAmount = (totalHt * vatRate) / 100;
      const finalAmountTtc = totalHt + finalVatAmount;

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          invoice_number: invoiceNumber,
          client_id: data.client_id || null,
          client_name: data.client_name || null,
          client_email: data.client_email || null,
          client_address: data.client_address || null,
          quote_id: data.quote_id || null,
          description: data.description || null,
          amount_ht: totalHt,
          vat_rate: vatRate,
          vat_amount: finalVatAmount,
          amount_ttc: finalAmountTtc,
          due_date: data.due_date || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return invoice as Invoice;
    },
    onSuccess: async (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      
      // Vérifier si l'envoi automatique est activé
      try {
        const { data: settings } = await supabase
          .from("user_settings")
          .select("auto_send_email")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (settings?.auto_send_email && invoice.client_email) {
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
        console.error("Erreur vérification auto_send_email:", error);
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

      // Recalculer les montants si amount_ht ou vat_rate changent
      if (updateData.amount_ht !== undefined || updateData.vat_rate !== undefined) {
        const { data: currentInvoiceData } = await supabase
          .from("invoices")
          .select("amount_ht, vat_rate")
          .eq("id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();

        const amountHt = updateData.amount_ht ?? currentInvoiceData?.amount_ht ?? 0;
        const vatRate = updateData.vat_rate ?? currentInvoiceData?.vat_rate ?? 20;
        const vatAmount = (amountHt * vatRate) / 100;
        const amountTtc = amountHt + vatAmount;

        updateData.vat_amount = vatAmount;
        updateData.amount_ttc = amountTtc;
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
      return invoice as Invoice;
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

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Facture supprimée",
        description: "La facture a été supprimée avec succès.",
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



