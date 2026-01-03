/**
 * Service pour envoyer des emails de devis depuis le compte de l'utilisateur
 */

import { supabase } from "@/integrations/supabase/client";
import type { SendQuoteEmailParams, SendEmailResponse } from "@/types/email";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Envoie un email de devis depuis le compte de l'utilisateur
 * 
 * @param params - Paramètres de l'email
 * @returns Réponse avec succès ou erreur
 */
export async function sendQuoteEmailFromUser(
  params: SendQuoteEmailParams
): Promise<SendEmailResponse> {
  console.log("📧 [sendQuoteEmailFromUser] Début de l'envoi d'email");

  // Vérifier l'authentification
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error("❌ [sendQuoteEmailFromUser] Utilisateur non authentifié:", sessionError);
    throw new Error("Vous devez être connecté pour envoyer un email");
  }

  console.log("✅ [sendQuoteEmailFromUser] Utilisateur authentifié:", session.user.id);

  // Préparer le body de la requête
  const requestBody = {
    quoteId: params.quoteId,
    quoteNumber: params.quoteNumber,
    clientEmail: params.clientEmail,
    clientName: params.clientName,
    includePDF: params.includePDF !== false, // Par défaut true
    customMessage: params.customMessage,
  };

  console.log("📤 [sendQuoteEmailFromUser] Envoi de la requête:", {
    quoteId: params.quoteId,
    quoteNumber: params.quoteNumber,
    clientEmail: params.clientEmail,
    includePDF: requestBody.includePDF,
  });

  try {
    // Appeler l'Edge Function
    const functionUrl = `${SUPABASE_URL}/functions/v1/send-email-from-user`;
    
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    // Lire la réponse même en cas d'erreur
    const responseData = await response.json();

    console.log("📥 [sendQuoteEmailFromUser] Réponse reçue:", {
      status: response.status,
      ok: response.ok,
      data: responseData,
    });

    if (!response.ok) {
      const errorMessage = responseData.error || responseData.details || "Erreur lors de l'envoi de l'email";
      console.error("❌ [sendQuoteEmailFromUser] Erreur:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        details: responseData,
      };
    }

    console.log("✅ [sendQuoteEmailFromUser] Email envoyé avec succès:", responseData.email_id);

    return {
      success: true,
      email_id: responseData.email_id,
      message: responseData.message || "Email envoyé avec succès",
    };
  } catch (error: any) {
    console.error("❌ [sendQuoteEmailFromUser] Erreur non gérée:", error);
    
    return {
      success: false,
      error: error.message || "Erreur lors de l'envoi de l'email",
      details: error,
    };
  }
}

/**
 * Vérifie si l'utilisateur a configuré son compte email
 * 
 * @returns true si configuré, false sinon
 */
export async function checkUserEmailConfigured(): Promise<{
  configured: boolean;
  provider?: string;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { configured: false, error: "Non authentifié" };
  }

  try {
    const { data, error } = await supabase
      .from("user_email_settings")
      .select("provider, smtp_host, smtp_user, oauth_access_token")
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      return { configured: false, error: "Configuration email non trouvée" };
    }

    // Vérifier que la configuration est complète
    const isConfigured = 
      (data.provider === "gmail" && data.oauth_access_token) ||
      (data.provider === "outlook" && data.oauth_access_token) ||
      (data.provider === "smtp" && data.smtp_host && data.smtp_user);

    return {
      configured: isConfigured,
      provider: data.provider,
      error: isConfigured ? undefined : "Configuration email incomplète",
    };
  } catch (error: any) {
    return { configured: false, error: error.message };
  }
}











