/**
 * 📧 SERVICE CENTRALISÉ DE MESSAGERIE
 * 
 * Point d'entrée unique pour TOUS les envois d'emails dans l'application.
 * Garantit que chaque email envoyé est automatiquement enregistré dans la Messagerie.
 * 
 * Principe:
 * 1. Envoyer l'email (via Edge Function)
 * 2. Enregistrer automatiquement dans la table messages
 * 3. Lier au client et au document concerné
 * 
 * Usage:
 * await sendMessage({
 *   messageType: 'quote',
 *   recipientEmail: 'client@example.com',
 *   subject: 'Votre devis',
 *   body: 'Bonjour...',
 *   documentId: quoteId,
 *   documentType: 'quote'
 * });
 */

import { supabase } from "@/integrations/supabase/client";

// =====================================================
// TYPES
// =====================================================

export type MessageType = 
  | 'quote'           // Envoi de devis
  | 'invoice'         // Envoi de facture
  | 'payment_link'    // Envoi de lien de paiement
  | 'signature'       // Demande de signature
  | 'reminder'        // Relance
  | 'confirmation'    // Confirmation
  | 'other';         // Autre

export type MessageStatus = 
  | 'pending'    // En attente d'envoi
  | 'sent'       // Envoyé
  | 'delivered'  // Délivré
  | 'opened'     // Ouvert par le destinataire
  | 'failed'     // Échec
  | 'bounced';   // Rejeté

export type DocumentType = 'quote' | 'invoice' | 'payment' | 'other';

export interface MessageAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface SendMessageParams {
  // Type et destinataire
  messageType: MessageType;
  recipientEmail: string;
  recipientName?: string;
  
  // Contenu
  subject: string;
  body: string;
  bodyHtml?: string;
  bodyText?: string;
  
  // Liens vers documents
  clientId?: string;
  documentId?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  
  // Pièces jointes
  attachments?: MessageAttachment[];
  
  // Options d'envoi
  includePDF?: boolean;
  includeSignatureLink?: boolean;
  signatureUrl?: string;
  
  // Métadonnées additionnelles
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  user_id: string;
  client_id: string | null;
  message_type: MessageType;
  document_id: string | null;
  document_type: DocumentType | null;
  document_number: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body: string;
  body_html: string | null;
  body_text: string | null;
  attachments: MessageAttachment[];
  status: MessageStatus;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  error_message: string | null;
  error_code: string | null;
  external_id: string | null;
  provider: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =====================================================
// SERVICE PRINCIPAL
// =====================================================

/**
 * Envoie un email ET l'enregistre automatiquement dans la Messagerie
 */
export async function sendMessage(params: SendMessageParams): Promise<{
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
}> {
  console.log("📧 [MessageService] Envoi message:", {
    type: params.messageType,
    to: params.recipientEmail,
    subject: params.subject,
  });

  try {
    // 1. Vérifier l'authentification
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error("Utilisateur non authentifié");
    }

    // 2. Préparer le payload pour l'Edge Function
    const emailPayload: any = {
      to: params.recipientEmail,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText || params.body,
      type: params.messageType,
    };

    // Ajouter les IDs de documents si fournis
    if (params.documentId) {
      if (params.documentType === 'quote') {
        emailPayload.quote_id = params.documentId;
      } else if (params.documentType === 'invoice') {
        emailPayload.invoice_id = params.documentId;
      }
    }

    // Ajouter les pièces jointes si fournies
    if (params.attachments && params.attachments.length > 0) {
      emailPayload.attachments = params.attachments.map(att => {
        // Si url est déjà en base64 (sans data: prefix), l'utiliser directement
        // Sinon, extraire le base64 depuis data URL si présent
        let content = att.url;
        if (att.url.startsWith('data:')) {
          // Extraire la partie base64 après la virgule
          content = att.url.split(',')[1];
        }
        return {
          filename: att.name,
          content: content, // Base64 pour Resend
          type: att.type,
        };
      });
    }

    console.log("📤 [MessageService] Appel Edge Function send-email");

    // 3. Envoyer l'email via Edge Function
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
      body: emailPayload,
    });

    if (emailError) {
      console.error("❌ [MessageService] Erreur envoi email:", emailError);
      
      // Même en cas d'échec, enregistrer le message avec status 'failed'
      await recordMessage({
        ...params,
        status: 'failed',
        errorMessage: emailError.message,
        userId: session.user.id,
      });

      return {
        success: false,
        error: emailError.message,
      };
    }

    console.log("✅ [MessageService] Email envoyé:", emailData);

    // 4. Enregistrer le message dans la table messages
    const messageRecord = await recordMessage({
      ...params,
      status: 'sent',
      externalId: emailData?.email_id,
      userId: session.user.id,
    });

    if (!messageRecord.success) {
      console.warn("⚠️ [MessageService] Email envoyé mais pas enregistré dans messages");
    }

    return {
      success: true,
      messageId: messageRecord.messageId,
      externalId: emailData?.email_id,
    };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de l'envoi du message",
    };
  }
}

/**
 * Enregistre un message dans la table messages
 * (utilisé en interne par sendMessage)
 */
async function recordMessage(params: SendMessageParams & {
  status: MessageStatus;
  errorMessage?: string;
  errorCode?: string;
  externalId?: string;
  userId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const messageData: any = {
      user_id: params.userId,
      client_id: params.clientId || null,
      message_type: params.messageType,
      document_id: params.documentId || null,
      document_type: params.documentType || null,
      document_number: params.documentNumber || null,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName || null,
      subject: params.subject,
      body: params.body,
      body_html: params.bodyHtml || null,
      body_text: params.bodyText || null,
      attachments: params.attachments || [],
      status: params.status,
      sent_at: new Date().toISOString(),
      error_message: params.errorMessage || null,
      error_code: params.errorCode || null,
      external_id: params.externalId || null,
      provider: 'resend',
      metadata: params.metadata || {},
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();

    if (error) {
      console.error("❌ [MessageService] Erreur enregistrement message:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log("✅ [MessageService] Message enregistré:", data.id);

    return {
      success: true,
      messageId: data.id,
    };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur recordMessage:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

/**
 * Récupère les messages d'un utilisateur
 */
export async function getMessages(filters?: {
  clientId?: string;
  messageType?: MessageType;
  documentId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ data: Message[]; count: number; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Non authentifié");
    }

    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('sent_at', { ascending: false });

    // Appliquer les filtres
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.messageType) {
      query = query.eq('message_type', filters.messageType);
    }
    if (filters?.documentId) {
      query = query.eq('document_id', filters.documentId);
    }
    if (filters?.startDate) {
      query = query.gte('sent_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('sent_at', filters.endDate.toISOString());
    }

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      data: (data || []) as Message[],
      count: count || 0,
    };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur getMessages:", error);
    return {
      data: [],
      count: 0,
      error: error.message,
    };
  }
}

/**
 * Récupère un message par ID
 */
export async function getMessageById(messageId: string): Promise<{ data: Message | null; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Non authentifié");
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      throw error;
    }

    return {
      data: data as Message,
    };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur getMessageById:", error);
    return {
      data: null,
      error: error.message,
    };
  }
}

/**
 * Récupère les messages liés à un document spécifique
 */
export async function getMessagesByDocument(
  documentId: string,
  documentType: DocumentType
): Promise<{ data: Message[]; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Non authentifié");
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('document_id', documentId)
      .eq('document_type', documentType)
      .order('sent_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      data: (data || []) as Message[],
    };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur getMessagesByDocument:", error);
    return {
      data: [],
      error: error.message,
    };
  }
}

/**
 * Marque un message comme livré
 */
export async function markAsDelivered(messageId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) {
      throw error;
    }

    return { success: true };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur markAsDelivered:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Marque un message comme ouvert
 */
export async function markAsOpened(messageId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) {
      throw error;
    }

    return { success: true };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur markAsOpened:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Supprime un ou plusieurs messages
 */
export async function deleteMessages(messageIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Non authentifié");
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .in('id', messageIds)
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }

    return { success: true };

  } catch (error: any) {
    console.error("❌ [MessageService] Erreur deleteMessages:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
