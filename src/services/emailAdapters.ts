/**
 * 🔄 ADAPTERS POUR MIGRATION PROGRESSIVE
 * 
 * Wrappers qui utilisent le nouveau MessageService en interne
 * tout en gardant les signatures existantes pour faciliter la migration.
 * 
 * Usage:
 * Remplacer progressivement tous les appels directs aux Edge Functions
 * par ces adapters qui utilisent automatiquement le nouveau MessageService.
 */

import { sendMessage, SendMessageParams } from "./messageService";
import { supabase } from "@/integrations/supabase/client";

// =====================================================
// ADAPTER: Envoi de devis
// =====================================================

export interface SendQuoteParams {
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
  clientId?: string;
  includePDF?: boolean;
  includeSignatureLink?: boolean;
  signatureUrl?: string;
  customMessage?: string;
}

export async function sendQuoteEmail(params: SendQuoteParams) {
  console.log("📧 [EmailAdapter] Envoi devis via MessageService");

  // Préparer le contenu
  const subject = `Devis ${params.quoteNumber} - ${params.clientName}`;
  
  const bodyText = params.customMessage || 
    `Bonjour ${params.clientName},\n\nVeuillez trouver ci-joint votre devis ${params.quoteNumber}.\n\nCordialement.`;

  const bodyHtml = `
    <p>Bonjour <strong>${params.clientName}</strong>,</p>
    <p>Veuillez trouver ci-joint votre devis <strong>${params.quoteNumber}</strong>.</p>
    <p>Cordialement.</p>
  `;

  // Envoyer via MessageService
  const result = await sendMessage({
    messageType: params.includeSignatureLink ? 'signature' : 'quote',
    recipientEmail: params.clientEmail,
    recipientName: params.clientName,
    subject,
    body: bodyText,
    bodyHtml,
    bodyText,
    clientId: params.clientId,
    documentId: params.quoteId,
    documentType: 'quote',
    documentNumber: params.quoteNumber,
    includePDF: params.includePDF,
    includeSignatureLink: params.includeSignatureLink,
    signatureUrl: params.signatureUrl,
  });

  if (result.success) {
    // Mettre à jour le statut du devis
    await supabase
      .from('ai_quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', params.quoteId);
  }

  return result;
}

// =====================================================
// ADAPTER: Envoi de facture
// =====================================================

export interface SendInvoiceParams {
  to: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientId?: string;
  includePDF?: boolean;
  includeSignatureLink?: boolean;
  signatureUrl?: string;
  customMessage?: string;
}

export async function sendInvoiceEmail(params: SendInvoiceParams) {
  console.log("📧 [EmailAdapter] Envoi facture via MessageService");

  const subject = `Facture ${params.invoiceNumber} - ${params.clientName}`;
  
  const bodyText = params.customMessage || 
    `Bonjour ${params.clientName},\n\nVeuillez trouver ci-joint votre facture ${params.invoiceNumber}.\n\nCordialement.`;

  const bodyHtml = `
    <p>Bonjour <strong>${params.clientName}</strong>,</p>
    <p>Veuillez trouver ci-joint votre facture <strong>${params.invoiceNumber}</strong>.</p>
    <p>Cordialement.</p>
  `;

  const result = await sendMessage({
    messageType: params.includeSignatureLink ? 'signature' : 'invoice',
    recipientEmail: params.to,
    recipientName: params.clientName,
    subject,
    body: bodyText,
    bodyHtml,
    bodyText,
    clientId: params.clientId,
    documentId: params.invoiceId,
    documentType: 'invoice',
    documentNumber: params.invoiceNumber,
    includePDF: params.includePDF,
    includeSignatureLink: params.includeSignatureLink,
    signatureUrl: params.signatureUrl,
  });

  if (result.success) {
    await supabase
      .from('invoices')
      .update({
        status: 'sent',
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', params.invoiceId);
  }

  return result;
}

// =====================================================
// ADAPTER: Envoi de lien de paiement
// =====================================================

export interface SendPaymentLinkParams {
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
  clientId?: string;
  paymentUrl: string;
  amount: number;
  paymentType: 'deposit' | 'total' | 'installments';
}

export async function sendPaymentLinkEmail(params: SendPaymentLinkParams) {
  console.log("📧 [EmailAdapter] Envoi lien de paiement via MessageService");

  const paymentTypeLabels = {
    deposit: 'Acompte',
    total: 'Paiement total',
    installments: 'Paiement en plusieurs fois',
  };

  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(params.amount);

  const subject = `💳 Votre lien de paiement - ${params.quoteNumber}`;
  
  const bodyText = `Bonjour ${params.clientName},\n\nMerci d'avoir signé le devis ${params.quoteNumber}.\n\nVoici votre lien de paiement : ${params.paymentUrl}\n\nMontant : ${formattedAmount}\nType : ${paymentTypeLabels[params.paymentType]}\n\nCordialement.`;

  const bodyHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2>💳 Votre lien de paiement</h2>
      <p>Bonjour <strong>${params.clientName}</strong>,</p>
      <p>Merci d'avoir signé le devis <strong>${params.quoteNumber}</strong>. Vous pouvez maintenant procéder au paiement.</p>
      <table style="width:100%;background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0;">
        <tr><td style="color:#6b7280;">Devis</td><td style="text-align:right;font-weight:600;">${params.quoteNumber}</td></tr>
        <tr><td style="color:#6b7280;padding-top:8px;">Type</td><td style="text-align:right;font-weight:600;padding-top:8px;">${paymentTypeLabels[params.paymentType]}</td></tr>
        <tr><td style="color:#6b7280;padding-top:8px;font-weight:600;">Montant</td><td style="text-align:right;font-size:24px;color:#3b82f6;font-weight:700;padding-top:8px;">${formattedAmount}</td></tr>
      </table>
      <div style="text-align:center;margin:30px 0;">
        <a href="${params.paymentUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;text-decoration:none;border-radius:8px;font-weight:700;">💳 Payer maintenant</a>
      </div>
      <p style="color:#065f46;background:#ecfdf5;padding:15px;border-left:4px solid #10b981;border-radius:6px;">✓ Paiement 100% sécurisé - Vos informations sont protégées par Stripe.</p>
    </div>
  `;

  return await sendMessage({
    messageType: 'payment_link',
    recipientEmail: params.clientEmail,
    recipientName: params.clientName,
    subject,
    body: bodyText,
    bodyHtml,
    bodyText,
    clientId: params.clientId,
    documentId: params.quoteId,
    documentType: 'quote',
    documentNumber: params.quoteNumber,
    metadata: {
      payment_url: params.paymentUrl,
      amount: params.amount,
      payment_type: params.paymentType,
    },
  });
}

// =====================================================
// ADAPTER: Envoi de confirmation
// =====================================================

export interface SendConfirmationParams {
  clientEmail: string;
  clientName: string;
  clientId?: string;
  subject: string;
  message: string;
  documentId?: string;
  documentType?: 'quote' | 'invoice' | 'payment';
  documentNumber?: string;
}

export async function sendConfirmationEmail(params: SendConfirmationParams) {
  console.log("📧 [EmailAdapter] Envoi confirmation via MessageService");

  const bodyHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2>${params.subject}</h2>
      <p>Bonjour <strong>${params.clientName}</strong>,</p>
      <p>${params.message}</p>
      <p>Cordialement.</p>
    </div>
  `;

  return await sendMessage({
    messageType: 'confirmation',
    recipientEmail: params.clientEmail,
    recipientName: params.clientName,
    subject: params.subject,
    body: params.message,
    bodyHtml,
    bodyText: params.message,
    clientId: params.clientId,
    documentId: params.documentId,
    documentType: params.documentType,
    documentNumber: params.documentNumber,
  });
}

// =====================================================
// ADAPTER: Envoi de relance
// =====================================================

export interface SendReminderParams {
  clientEmail: string;
  clientName: string;
  clientId?: string;
  subject: string;
  message: string;
  documentId?: string;
  documentType?: 'quote' | 'invoice' | 'payment';
  documentNumber?: string;
}

export async function sendReminderEmail(params: SendReminderParams) {
  console.log("📧 [EmailAdapter] Envoi relance via MessageService");

  const bodyHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2>🔔 ${params.subject}</h2>
      <p>Bonjour <strong>${params.clientName}</strong>,</p>
      <p>${params.message}</p>
      <p>Cordialement.</p>
    </div>
  `;

  return await sendMessage({
    messageType: 'reminder',
    recipientEmail: params.clientEmail,
    recipientName: params.clientName,
    subject: params.subject,
    body: params.message,
    bodyHtml,
    bodyText: params.message,
    clientId: params.clientId,
    documentId: params.documentId,
    documentType: params.documentType,
    documentNumber: params.documentNumber,
  });
}
