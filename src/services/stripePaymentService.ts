import { supabase } from "@/integrations/supabase/client";

export interface PaymentLinkParams {
  invoice_id?: string;
  quote_id?: string;
  payment_type: "deposit" | "invoice" | "final";
  amount?: number;
  deposit_percentage?: number;
  deposit_fixed_amount?: number;
  description?: string;
}

export interface PaymentLinkResult {
  checkout_url: string;
  payment_id: string;
  session_id: string;
}

/**
 * Service pour gérer les paiements Stripe
 */

/**
 * Créer un lien de paiement pour acompte (devis signé)
 */
export const createDepositPaymentLink = async (
  quoteId: string,
  options?: {
    depositPercentage?: number;
    depositFixedAmount?: number;
    quoteAmount: number;
  }
): Promise<PaymentLinkResult> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // Calculer le montant de l'acompte
  let depositAmount = 0;
  if (options?.depositFixedAmount) {
    depositAmount = options.depositFixedAmount;
  } else if (options?.depositPercentage) {
    depositAmount = (options.quoteAmount * options.depositPercentage) / 100;
  } else {
    depositAmount = options.quoteAmount * 0.3; // 30% par défaut
  }

  const { data, error } = await supabase.functions.invoke("create-payment-session", {
    body: {
      quote_id: quoteId,
      payment_type: "deposit",
      amount: depositAmount,
      deposit_percentage: options?.depositPercentage,
      deposit_fixed_amount: options?.depositFixedAmount,
      description: `Acompte pour devis ${quoteId.substring(0, 8)}`,
    },
  });

  if (error) throw error;
  if (!data?.checkout_url) throw new Error("Impossible de créer le lien de paiement");

  return {
    checkout_url: data.checkout_url,
    payment_id: data.payment_id || "",
    session_id: data.session_id || "",
  };
};

/**
 * Créer un lien de paiement pour facture
 */
export const createInvoicePaymentLink = async (
  invoiceId: string,
  amount?: number
): Promise<PaymentLinkResult> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("create-payment-session", {
    body: {
      invoice_id: invoiceId,
      payment_type: "invoice",
      amount: amount,
      description: `Paiement facture ${invoiceId.substring(0, 8)}`,
    },
  });

  if (error) throw error;
  if (!data?.checkout_url) throw new Error("Impossible de créer le lien de paiement");

  return {
    checkout_url: data.checkout_url,
    payment_id: data.payment_id || "",
    session_id: data.session_id || "",
  };
};

/**
 * Vérifier le statut d'un paiement
 */
export const checkPaymentStatus = async (paymentId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("user_id", session.user.id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Récupérer tous les paiements pour un document
 */
export const getDocumentPayments = async (
  documentType: "quote" | "invoice",
  documentId: string
) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", session.user.id)
    .eq(documentType === "quote" ? "quote_id" : "invoice_id", documentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};






