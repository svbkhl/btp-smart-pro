import { supabase } from "@/integrations/supabase/client";

export interface StatusEvent {
  id: string;
  document_type: "quote" | "invoice";
  document_id: string;
  event_type: "email_sent" | "email_viewed" | "signed" | "paid";
  event_data?: any;
  created_at: string;
}

/**
 * Service de suivi des statuts des devis et factures
 * Permet de tracker : envoyé, vu, signé, payé
 */

/**
 * Marquer un document comme envoyé par email
 */
export const trackEmailSent = async (
  documentType: "quote" | "invoice",
  documentId: string,
  recipientEmail: string,
  emailSubject?: string
) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // Construire l'objet de mise à jour avec seulement les champs qui existent
  const updateData: any = {
    status: "sent",
  };

  // Ajouter email_sent_at seulement si la colonne existe (on essaie et on ignore l'erreur si elle n'existe pas)
  // Pour ai_quotes, utiliser sent_at au lieu de email_sent_at
  if (documentType === "quote") {
    updateData.sent_at = new Date().toISOString();
  } else {
    updateData.email_sent_at = new Date().toISOString();
  }

  try {
    if (documentType === "quote") {
      const { error } = await supabase
        .from("ai_quotes")
        .update(updateData)
        .eq("id", documentId)
        .eq("user_id", session.user.id);
      
      if (error) {
        console.warn("⚠️ Erreur lors de la mise à jour du devis:", error);
        // Essayer sans sent_at si ça échoue
        const { error: retryError } = await supabase
          .from("ai_quotes")
          .update({ status: "sent" })
          .eq("id", documentId)
          .eq("user_id", session.user.id);
        
        if (retryError) {
          console.error("❌ Impossible de mettre à jour le statut du devis:", retryError);
        }
      }
    } else {
      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", documentId)
        .eq("user_id", session.user.id);
      
      if (error) {
        console.warn("⚠️ Erreur lors de la mise à jour de la facture:", error);
        // Essayer sans email_sent_at si ça échoue
        const { error: retryError } = await supabase
          .from("invoices")
          .update({ status: "sent" })
          .eq("id", documentId)
          .eq("user_id", session.user.id);
        
        if (retryError) {
          console.error("❌ Impossible de mettre à jour le statut de la facture:", retryError);
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ Erreur lors du suivi de l'email envoyé:", error);
    // Ne pas bloquer l'envoi de l'email si le tracking échoue
  }

  // Enregistrer l'événement dans email_messages si la table existe
  try {
    // Vérifier d'abord si la table existe en essayant une requête SELECT
    const { error: checkError } = await supabase
      .from("email_messages")
      .select("id")
      .limit(1);
    
    // Si la table n'existe pas, on ignore silencieusement
    if (checkError && checkError.code === '42P01') {
      console.log("ℹ️ Table email_messages n'existe pas encore, création ignorée");
      return;
    }

    // Insérer l'enregistrement
    const insertData: any = {
      user_id: session.user.id,
      recipient_email: recipientEmail,
      subject: emailSubject || `${documentType === "quote" ? "Devis" : "Facture"}`,
      document_type: documentType,
      document_id: documentId,
      status: "sent",
      sent_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("email_messages").insert(insertData);
    
    if (error) {
      // Si document_id n'existe pas, essayer sans
      if (error.message?.includes("document_id")) {
        console.warn("⚠️ Colonne document_id manquante, tentative sans cette colonne");
        const { error: retryError } = await supabase.from("email_messages").insert({
          user_id: session.user.id,
          recipient_email: recipientEmail,
          subject: emailSubject || `${documentType === "quote" ? "Devis" : "Facture"}`,
          document_type: documentType,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        if (retryError) {
          console.warn("⚠️ Impossible d'enregistrer dans email_messages:", retryError);
        }
      } else {
        console.warn("⚠️ Impossible d'enregistrer dans email_messages:", error);
      }
    } else {
      console.log("✅ Email message enregistré avec succès");
    }
  } catch (error) {
    // Table peut ne pas exister, on ignore l'erreur
    console.warn("⚠️ Table email_messages n'existe pas ou erreur:", error);
  }
};

/**
 * Marquer un document comme vu (via pixel tracking)
 */
export const trackEmailViewed = async (
  documentType: "quote" | "invoice",
  documentId: string,
  token?: string
) => {
  const updateData: any = {
    email_viewed_at: new Date().toISOString(),
  };

  // Si on a un token, on peut mettre à jour via la session de signature
  if (token) {
    const { data: session } = await supabase
      .from("signature_sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (session) {
      if (documentType === "quote" && session.quote_id) {
        await supabase
          .from("ai_quotes")
          .update(updateData)
          .eq("id", session.quote_id);
      } else if (documentType === "invoice" && session.invoice_id) {
        await supabase
          .from("invoices")
          .update(updateData)
          .eq("id", session.invoice_id);
      }
    }
  } else {
    // Mise à jour directe (pour usage interne)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    if (documentType === "quote") {
      await supabase
        .from("ai_quotes")
        .update(updateData)
        .eq("id", documentId)
        .eq("user_id", session.user.id);
    } else {
      await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", documentId)
        .eq("user_id", session.user.id);
    }
  }
};

/**
 * Marquer un document comme signé
 */
export const trackSigned = async (
  documentType: "quote" | "invoice",
  documentId: string,
  signerName: string,
  signatureData: string
) => {
  const updateData: any = {
    status: documentType === "quote" ? "accepted" : "signed",
    signed_at: new Date().toISOString(),
    signed_by: signerName,
    signature_data: signatureData,
  };

  if (documentType === "quote") {
    await supabase
      .from("ai_quotes")
      .update(updateData)
      .eq("id", documentId);
  } else {
    await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", documentId);
  }
};

/**
 * Marquer un document comme payé
 */
export const trackPaid = async (
  documentType: "quote" | "invoice",
  documentId: string,
  paymentId?: string,
  amount?: number
) => {
  const updateData: any = {
    status: "paid",
    paid_at: new Date().toISOString(),
    payment_status: "paid",
  };

  if (documentType === "quote") {
    // Pour un devis, on peut créer une facture automatiquement
    await supabase
      .from("ai_quotes")
      .update({ ...updateData, status: "accepted" })
      .eq("id", documentId);
  } else {
    await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", documentId);
  }

  // Mettre à jour le paiement si paymentId fourni
  if (paymentId) {
    await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        amount: amount,
      })
      .eq("id", paymentId);
  }
};

/**
 * Récupérer l'historique des événements pour un document
 */
export const getStatusHistory = async (
  documentType: "quote" | "invoice",
  documentId: string
): Promise<StatusEvent[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const events: StatusEvent[] = [];

  // Récupérer le document
  let document: any = null;
  if (documentType === "quote") {
    const { data } = await supabase
      .from("ai_quotes")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", session.user.id)
      .single();
    document = data;
  } else {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", session.user.id)
      .single();
    document = data;
  }

  if (!document) return events;

  // Construire l'historique depuis les dates du document
  if (document.email_sent_at) {
    events.push({
      id: `email_sent_${documentId}`,
      document_type: documentType,
      document_id: documentId,
      event_type: "email_sent",
      created_at: document.email_sent_at,
    });
  }

  if (document.email_viewed_at) {
    events.push({
      id: `email_viewed_${documentId}`,
      document_type: documentType,
      document_id: documentId,
      event_type: "email_viewed",
      created_at: document.email_viewed_at,
    });
  }

  if (document.signed_at) {
    events.push({
      id: `signed_${documentId}`,
      document_type: documentType,
      document_id: documentId,
      event_type: "signed",
      event_data: {
        signed_by: document.signed_by,
      },
      created_at: document.signed_at,
    });
  }

  if (document.paid_at) {
    events.push({
      id: `paid_${documentId}`,
      document_type: documentType,
      document_id: documentId,
      event_type: "paid",
      created_at: document.paid_at,
    });
  }

  // Trier par date
  return events.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};




