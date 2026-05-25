import { supabase } from "@/integrations/supabase/client";
import { generateQuotePDFBase64 } from "./pdfService";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: 'confirmation' | 'reminder' | 'notification' | 'quote' | 'invoice' | 'signature_request' | 'payment_confirmation';
  attachments?: Array<{
    filename: string;
    content: string; // Base64
    type: string;
  }>;
}

export interface SendQuoteEmailParams {
  to: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  includePDF?: boolean;
  includeSignatureLink?: boolean;
  signatureUrl?: string;
  customMessage?: string;
}

export interface SendInvoiceEmailParams {
  to: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  includePDF?: boolean;
  includeSignatureLink?: boolean;
  signatureUrl?: string;
  paymentLink?: string;
  customMessage?: string;
}

/**
 * Envoie un email via l'Edge Function send-email
 */
export const sendEmail = async (params: SendEmailParams) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log("📧 Calling send-email Edge Function with:", {
    to: params.to,
    subject: params.subject,
    hasHtml: !!params.html,
    hasText: !!params.text,
    type: params.type,
  });

  try {
    const requestBody: any = {
      to: params.to,
      subject: params.subject,
      html: params.html,
      type: params.type || 'notification',
    };

    // Only include text if provided
    if (params.text) {
      requestBody.text = params.text;
    }

    // Only include attachments if provided
    if (params.attachments && params.attachments.length > 0) {
      requestBody.attachments = params.attachments;
    }

    console.log("📧 Request payload:", {
      to: requestBody.to,
      subject: requestBody.subject,
      hasHtml: !!requestBody.html,
      hasText: !!requestBody.text,
      htmlLength: requestBody.html?.length || 0,
      textLength: requestBody.text?.length || 0,
      type: requestBody.type,
    });

    // Utiliser fetch directement pour avoir accès au body même en cas d'erreur 500
    const functionUrl = `${SUPABASE_URL}/functions/v1/send-email`;
    
    const fetchResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    let responseData: any = null;
    const responseText = await fetchResponse.text();
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.warn("⚠️ Could not parse response as JSON:", responseText.substring(0, 200));
      responseData = { error: responseText || 'Unknown error' };
    }

    console.log("📧 Edge Function response:", {
      status: fetchResponse.status,
      ok: fetchResponse.ok,
      data: responseData,
    });

    if (!fetchResponse.ok || responseData?.error) {
      const errorMessage = responseData?.error || responseData?.message || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`;
      const errorDetails = responseData?.details || (responseData?.error ? responseData : null);
      
      console.error("❌ Edge Function error:", errorMessage, errorDetails);
      
      let fullErrorMessage = errorMessage;
      if (errorDetails && typeof errorDetails === 'object' && Object.keys(errorDetails).length > 0) {
        const detailsStr = JSON.stringify(errorDetails, null, 2);
        fullErrorMessage = `${errorMessage}\n\nDétails: ${detailsStr}`;
      } else if (responseText && !responseData) {
        // Si on n'a pas pu parser le JSON, afficher le texte brut
        fullErrorMessage = `${errorMessage}\n\nRéponse brute: ${responseText.substring(0, 500)}`;
      }
      
      throw new Error(fullErrorMessage);
    }

    return responseData;
  } catch (error: any) {
    // Si c'est déjà une Error, la relancer
    if (error instanceof Error) {
      throw error;
    }
    
    // Sinon, créer une nouvelle Error
    console.error("❌ Unexpected error in sendEmail:", error);
    throw new Error(error?.message || 'Failed to send email');
  }
};

/**
 * Envoie un email de devis avec PDF et lien de signature
 */
export const sendQuoteEmail = async (params: SendQuoteEmailParams) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Extraire l'UUID valide si l'ID contient un suffixe
  const { extractUUID } = await import("@/utils/uuidExtractor");
  const validQuoteId = extractUUID(params.quoteId);
  if (!validQuoteId) {
    throw new Error("Format d'ID de devis invalide");
  }

  // Récupérer le devis
  const { data: quote, error: quoteError } = await supabase
    .from("ai_quotes")
    .select("*")
    .eq("id", validQuoteId) // Utiliser l'UUID extrait
    .eq("user_id", session.user.id)
    .single();

  if (quoteError || !quote) throw new Error("Devis introuvable");

  // Générer le HTML du template
  const html = generateQuoteEmailHTML({
    quoteNumber: params.quoteNumber,
    clientName: params.clientName,
    customMessage: params.customMessage,
    signatureUrl: params.includeSignatureLink ? params.signatureUrl : undefined,
  });

  // Préparer les pièces jointes
  const attachments: SendEmailParams["attachments"] = [];
  
  if (params.includePDF) {
    try {
      // Récupérer les informations de l'entreprise
      const { data: companySettings } = await supabase
        .from("user_settings")
        .select("company_name, legal_form, company_logo_url, address, city, postal_code, country, siret, vat_number")
        .eq("user_id", session.user.id)
        .single();

      // Récupérer les informations du client
      let clientInfo = {
        name: params.clientName,
        email: params.to,
        phone: "",
        location: "",
      };

      // Si le devis est lié à un projet, récupérer les infos du client depuis le projet
      if (quote.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("client_id, clients(name, email, phone, location)")
          .eq("id", quote.project_id)
          .single();

        if (project?.clients) {
          const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
          clientInfo = {
            name: client.name || params.clientName,
            email: client.email || params.to,
            phone: client.phone || "",
            location: client.location || "",
          };
        }
      }

      // Charger sections et lignes pour les devis détaillés
      const { data: quoteSections = [] } = await supabase
        .from("quote_sections")
        .select("id, title, position")
        .eq("quote_id", validQuoteId)
        .order("position");

      const { data: quoteLines = [] } = await supabase
        .from("quote_lines")
        .select("*")
        .eq("quote_id", validQuoteId)
        .order("position");

      const effectiveTvaRate = (quote.tva_non_applicable_293b ? 0 : (quote.tva_rate ?? 0.20));
      const quoteMode = quote.mode === "detailed" || quoteLines.length > 0 ? "detailed" : "simple";

      const pdfLines = quoteLines.map((l: any) => ({
        label: l.label,
        description: l.description,
        unit: l.unit || "",
        quantity: l.quantity || 0,
        unit_price_ht: l.unit_price_ht || 0,
        total_ht: l.total_ht,
        tva_rate: effectiveTvaRate,
        total_tva: quote.tva_non_applicable_293b ? 0 : l.total_ht * effectiveTvaRate,
        total_ttc: quote.tva_non_applicable_293b ? l.total_ht : l.total_ht * (1 + effectiveTvaRate),
        section_id: l.section_id,
      }));

      const subtotal_ht = quote.subtotal_ht ?? quote.estimated_cost ?? 0;
      const total_ttc = quote.total_ttc ?? (subtotal_ht * (1 + effectiveTvaRate));

      // Générer le PDF en base64
      const pdfData = await generateQuotePDFBase64({
        result: {
          estimatedCost: total_ttc,
          quote_number: quote.quote_number,
          description: quote.details?.description || "",
        },
        companyInfo: {
          companyName: companySettings?.company_name || "Votre Entreprise",
          legalForm: companySettings?.legal_form || "",
          logoUrl: companySettings?.company_logo_url || "",
          address: companySettings?.address || "",
          city: companySettings?.city || "",
          postalCode: companySettings?.postal_code || "",
          country: companySettings?.country || "",
          siret: companySettings?.siret || "",
          vatNumber: companySettings?.vat_number || "",
        },
        clientInfo,
        quoteDate: new Date(quote.created_at),
        quoteNumber: params.quoteNumber,
        mode: quoteMode,
        tvaRate: effectiveTvaRate,
        tva293b: quote.tva_non_applicable_293b ?? false,
        sections: quoteSections,
        lines: pdfLines,
        subtotal_ht,
        total_tva: quote.tva_non_applicable_293b ? 0 : (quote.total_tva ?? subtotal_ht * effectiveTvaRate),
        total_ttc,
        signatureData: quote.signature_data || undefined,
        signedBy: quote.signed_by || undefined,
        signedAt: quote.signed_at || undefined,
      });

      // Ajouter le PDF aux pièces jointes
      attachments.push({
        filename: pdfData.filename,
        content: pdfData.base64,
        type: "application/pdf",
      });

      console.log("✅ PDF généré et ajouté en pièce jointe:", pdfData.filename);
    } catch (pdfError) {
      console.error("❌ Erreur lors de la génération du PDF:", pdfError);
      // On continue quand même l'envoi de l'email sans le PDF
      // L'utilisateur sera informé via un toast si nécessaire
    }
  }

  return sendEmail({
    to: params.to,
    subject: `Devis ${params.quoteNumber} - ${params.clientName}`,
    html,
    type: 'quote',
    attachments,
  });
};

/**
 * Envoie un email de facture avec PDF et lien de signature/paiement
 */
export const sendInvoiceEmail = async (params: SendInvoiceEmailParams) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Récupérer la facture
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.invoiceId)
    .eq("user_id", session.user.id)
    .single();

  if (invoiceError || !invoice) throw new Error("Facture introuvable");

  // Générer le HTML du template
  const html = generateInvoiceEmailHTML({
    invoiceNumber: params.invoiceNumber,
    clientName: params.clientName,
    amount: invoice.amount_ttc,
    customMessage: params.customMessage,
    signatureUrl: params.includeSignatureLink ? params.signatureUrl : undefined,
    paymentLink: params.paymentLink,
  });

  // Préparer les pièces jointes
  const attachments: SendEmailParams["attachments"] = [];
  
  if (params.includePDF) {
    // TODO: Générer le PDF et l'ajouter en pièce jointe
  }

  return sendEmail({
    to: params.to,
    subject: `Facture ${params.invoiceNumber} - ${params.clientName}`,
    html,
    type: 'invoice',
    attachments,
  });
};

/**
 * Envoie un email de demande de signature
 */
export const sendSignatureRequestEmail = async (
  to: string,
  documentType: "quote" | "invoice",
  documentNumber: string,
  clientName: string,
  signatureUrl: string,
  customMessage?: string
) => {
  const html = generateSignatureRequestEmailHTML({
    documentType,
    documentNumber,
    clientName,
    signatureUrl,
    customMessage,
  });

  return sendEmail({
    to,
    subject: `Signature requise - ${documentType === "quote" ? "Devis" : "Facture"} ${documentNumber}`,
    html,
    type: 'signature_request',
  });
};

/**
 * Envoie un email de confirmation de paiement
 */
export const sendPaymentConfirmationEmail = async (
  to: string,
  documentType: "quote" | "invoice",
  documentNumber: string,
  clientName: string,
  amount: number,
  paymentDate: Date
) => {
  const html = generatePaymentConfirmationEmailHTML({
    documentType,
    documentNumber,
    clientName,
    amount,
    paymentDate,
  });

  return sendEmail({
    to,
    subject: `Confirmation de paiement - ${documentType === "quote" ? "Devis" : "Facture"} ${documentNumber}`,
    html,
    type: 'payment_confirmation',
  });
};

/**
 * Génère le HTML pour l'email de devis
 * @deprecated Use generateQuoteEmail from emailTemplateService instead
 */
function generateQuoteEmailHTML(params: {
  quoteNumber: string;
  clientName: string;
  customMessage?: string;
  signatureUrl?: string;
}): string {
  // Use modern template system
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Devis ${params.quoteNumber}</h1>
        </div>
        <div class="content">
          <p>Bonjour ${params.clientName},</p>
          ${params.customMessage ? `<p>${params.customMessage}</p>` : '<p>Nous vous adressons le devis demandé en pièce jointe.</p>'}
          ${params.signatureUrl ? `
            <p>Vous pouvez le consulter et le signer directement en cliquant sur le lien ci-dessous :</p>
            <a href="${params.signatureUrl}" class="button">Signer le devis</a>
          ` : ''}
          <p>Cordialement,<br>L'équipe</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère le HTML pour l'email de facture
 */
function generateInvoiceEmailHTML(params: {
  invoiceNumber: string;
  clientName: string;
  amount: number;
  customMessage?: string;
  signatureUrl?: string;
  paymentLink?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .amount { font-size: 24px; font-weight: bold; color: #10b981; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Facture ${params.invoiceNumber}</h1>
        </div>
        <div class="content">
          <p>Bonjour ${params.clientName},</p>
          ${params.customMessage ? `<p>${params.customMessage}</p>` : '<p>Nous vous adressons la facture en pièce jointe.</p>'}
          <div class="amount">Montant : ${params.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div>
          ${params.signatureUrl ? `
            <a href="${params.signatureUrl}" class="button">Signer la facture</a>
          ` : ''}
          ${params.paymentLink ? `
            <a href="${params.paymentLink}" class="button" style="background: #3b82f6;">Payer en ligne</a>
          ` : ''}
          <p>Cordialement,<br>L'équipe</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère le HTML pour l'email de demande de signature
 */
function generateSignatureRequestEmailHTML(params: {
  documentType: "quote" | "invoice";
  documentNumber: string;
  clientName: string;
  signatureUrl: string;
  customMessage?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Signature requise</h1>
        </div>
        <div class="content">
          <p>Bonjour ${params.clientName},</p>
          ${params.customMessage ? `<p>${params.customMessage}</p>` : `<p>Nous vous demandons de bien vouloir signer le ${params.documentType === "quote" ? "devis" : "facture"} ${params.documentNumber}.</p>`}
          <a href="${params.signatureUrl}" class="button">Signer maintenant</a>
          <p>Cordialement,<br>L'équipe</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère le HTML pour l'email de confirmation de paiement
 */
function generatePaymentConfirmationEmailHTML(params: {
  documentType: "quote" | "invoice";
  documentNumber: string;
  clientName: string;
  amount: number;
  paymentDate: Date;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .amount { font-size: 24px; font-weight: bold; color: #10b981; margin: 20px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Paiement confirmé</h1>
        </div>
        <div class="content">
          <p>Bonjour ${params.clientName},</p>
          <p>Nous vous confirmons la réception de votre paiement pour le ${params.documentType === "quote" ? "devis" : "facture"} ${params.documentNumber}.</p>
          <div class="amount">Montant : ${params.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div>
          <p>Date de paiement : ${params.paymentDate.toLocaleDateString("fr-FR")}</p>
          <p>Merci pour votre confiance.</p>
          <p>Cordialement,<br>L'équipe</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envoie un email de confirmation de projet
 */
export const sendProjectConfirmationEmail = async (projectId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Appeler la fonction SQL qui génère et envoie l'email
  const { data, error } = await supabase.rpc('send_project_confirmation_email', {
    p_project_id: projectId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send confirmation email');
  }

  return data;
};
