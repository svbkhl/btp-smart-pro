/**
 * Service pour gérer les signatures de devis et factures
 */

import { supabase } from "@/integrations/supabase/client";

export interface Signature {
  id: string;
  quote_id?: string;
  invoice_id?: string;
  client_email: string;
  client_name?: string;
  signed: boolean;
  signed_at?: string;
  signature_data?: string;
  signature_link: string;
  payment_link?: string;
  payment_link_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSignatureParams {
  quoteId?: string;
  invoiceId?: string;
  clientEmail: string;
  clientName?: string;
}

/**
 * Crée une nouvelle signature et génère un lien unique
 */
export async function createSignature(
  params: CreateSignatureParams
): Promise<Signature> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Vous devez être connecté");
  }

  // Générer un ID unique pour le lien de signature
  const signatureId = crypto.randomUUID();
  
  // Construire l'URL de base de l'application
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const signatureLink = `${baseUrl}/signature/${signatureId}`;

  const signatureData = {
    id: signatureId,
    quote_id: params.quoteId || null,
    invoice_id: params.invoiceId || null,
    client_email: params.clientEmail,
    client_name: params.clientName || null,
    signature_link: signatureLink,
    signed: false,
  };

  console.log("📝 [signatureService] Création de la signature:", {
    signatureId,
    signatureLink,
    quoteId: params.quoteId,
    invoiceId: params.invoiceId,
  });

  const { data, error } = await supabase
    .from("signatures")
    .insert(signatureData)
    .select()
    .single();

  if (error) {
    console.error("❌ [signatureService] Erreur création signature:", error);
    throw new Error(`Impossible de créer la signature: ${error.message}`);
  }

  console.log("✅ [signatureService] Signature créée:", data.id);
  return data as Signature;
}

/**
 * Récupère une signature par son ID (lien)
 */
export async function getSignatureByLink(
  signatureId: string
): Promise<Signature | null> {
  const { data, error } = await supabase
    .from("signatures")
    .select("*")
    .eq("id", signatureId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Signature non trouvée
    }
    console.error("❌ [signatureService] Erreur récupération signature:", error);
    throw new Error(`Impossible de récupérer la signature: ${error.message}`);
  }

  return data as Signature;
}

/**
 * Récupère une signature par quote_id
 */
export async function getSignatureByQuoteId(
  quoteId: string
): Promise<Signature | null> {
  const { data, error } = await supabase
    .from("signatures")
    .select("*")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (error) {
    console.error("❌ [signatureService] Erreur récupération signature:", error);
    throw new Error(`Impossible de récupérer la signature: ${error.message}`);
  }

  return data as Signature | null;
}

/**
 * Marque une signature comme signée
 */
export async function signDocument(
  signatureId: string,
  signatureData?: string
): Promise<Signature> {
  console.log("✍️ [signatureService] Signature du document:", signatureId);

  const updateData: any = {
    signed: true,
    signed_at: new Date().toISOString(),
  };

  if (signatureData) {
    updateData.signature_data = signatureData;
  }

  const { data, error } = await supabase
    .from("signatures")
    .update(updateData)
    .eq("id", signatureId)
    .select()
    .single();

  if (error) {
    console.error("❌ [signatureService] Erreur signature:", error);
    throw new Error(`Impossible de signer le document: ${error.message}`);
  }

  console.log("✅ [signatureService] Document signé:", data.id);

  // Mettre à jour le devis/facture associé
  if (data.quote_id) {
    await supabase
      .from("ai_quotes")
      .update({
        signed: true,
        signed_at: updateData.signed_at,
        signed_by: data.client_name || data.client_email,
        signature_data: signatureData,
        status: "signed",
      })
      .eq("id", data.quote_id);
  } else if (data.invoice_id) {
    await supabase
      .from("invoices")
      .update({
        signed: true,
        signed_at: updateData.signed_at,
        signed_by: data.client_name || data.client_email,
        signature_data: signatureData,
        status: "signed",
      })
      .eq("id", data.invoice_id);
  }

  // Vérifier les préférences utilisateur pour le paiement conditionnel
  try {
    // Récupérer le propriétaire du devis/facture
    let quoteOwnerId: string | null = null;
    
    if (data.quote_id) {
      const { data: quote } = await supabase
        .from("ai_quotes")
        .select("user_id")
        .eq("id", data.quote_id)
        .single();
      quoteOwnerId = quote?.user_id || null;
    } else if (data.invoice_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("user_id")
        .eq("id", data.invoice_id)
        .single();
      quoteOwnerId = invoice?.user_id || null;
    }

    if (quoteOwnerId) {
      // Vérifier les paramètres utilisateur
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("payment_enabled, payment_provider")
        .eq("user_id", quoteOwnerId)
        .single();

      // Si le paiement est activé et un provider est configuré, générer et envoyer le lien
      if (userSettings?.payment_enabled && userSettings?.payment_provider) {
        console.log("💳 [signatureService] Paiement activé, génération du lien...");
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-link-after-signature`;
          await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ signature_id: signatureId }),
          });
          console.log("✅ [signatureService] Lien de paiement envoyé automatiquement");
        }
      } else {
        console.log("ℹ️ [signatureService] Paiement non activé ou provider non configuré");
      }
    }
  } catch (error) {
    console.warn("⚠️ [signatureService] Erreur vérification préférences paiement:", error);
    // Ne pas bloquer si la vérification échoue
  }

  return data as Signature;
}

/**
 * Enregistre un lien de paiement pour une signature
 */
export async function setPaymentLink(
  signatureId: string,
  paymentLink: string
): Promise<void> {
  const { error } = await supabase
    .from("signatures")
    .update({
      payment_link: paymentLink,
      payment_link_sent_at: new Date().toISOString(),
    })
    .eq("id", signatureId);

  if (error) {
    console.error("❌ [signatureService] Erreur enregistrement lien paiement:", error);
    throw new Error(`Impossible d'enregistrer le lien de paiement: ${error.message}`);
  }

  console.log("✅ [signatureService] Lien de paiement enregistré:", paymentLink);
}

