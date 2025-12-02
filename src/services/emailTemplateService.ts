import { supabase } from "@/integrations/supabase/client";

export interface EmailTemplateData {
  // Common fields
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companySiret?: string;
  companyTva?: string;
  clientName: string;
  year?: string;

  // Quote specific
  quoteNumber?: string;
  workType?: string;
  surface?: string;
  estimatedCost?: string;
  signatureUrl?: string;
  customMessage?: string;

  // Invoice specific
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  amountTTC?: string;
  paymentLink?: string;
  bankIban?: string;
  bankBic?: string;

  // Payment confirmation
  documentType?: string;
  documentNumber?: string;
  amount?: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
}

/**
 * Load an HTML email template and replace variables
 */
export async function loadEmailTemplate(
  templateName: string,
  data: EmailTemplateData
): Promise<string> {
  try {
    // Fetch template from public folder
    const response = await fetch(`/templates/emails/${templateName}.html`);
    if (!response.ok) {
      throw new Error(`Template ${templateName} not found`);
    }

    let template = await response.text();

    // Get user settings for company info
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("company_name, email, phone, siret, tva_number")
        .eq("user_id", session.user.id)
        .single();

      if (settings) {
        data.companyName = data.companyName || settings.company_name || "BTP Smart Pro";
        data.companyEmail = data.companyEmail || settings.email || "";
        data.companyPhone = data.companyPhone || settings.phone || "";
        data.companySiret = data.companySiret || settings.siret || "";
        data.companyTva = data.companyTva || settings.tva_number || "";
      }
    }

    // Add current year
    data.year = new Date().getFullYear().toString();

    // Replace all variables in template
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{${key.toUpperCase()}}}`, "g");
        template = template.replace(regex, String(value));
      }
    });

    // Handle conditional blocks (Handlebars-like syntax)
    // {{#if VARIABLE}}...{{/if}}
    template = template.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
      const value = data[variable.toLowerCase() as keyof EmailTemplateData];
      return value ? content : "";
    });

    // Clean up any remaining unreplaced variables
    template = template.replace(/{{[^}]+}}/g, "");

    return template;
  } catch (error) {
    console.error("Error loading email template:", error);
    throw error;
  }
}

/**
 * Generate quote email HTML
 */
export async function generateQuoteEmail(data: {
  quoteNumber: string;
  clientName: string;
  workType?: string;
  surface?: string;
  estimatedCost: string;
  signatureUrl?: string;
  customMessage?: string;
}): Promise<string> {
  return loadEmailTemplate("quote-email-modern", {
    ...data,
    clientName: data.clientName,
    customMessage: data.customMessage || "Nous vous adressons le devis demandé ci-joint.",
  });
}

/**
 * Generate invoice email HTML
 */
export async function generateInvoiceEmail(data: {
  invoiceNumber: string;
  clientName: string;
  amountTTC: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentLink?: string;
  signatureUrl?: string;
  bankIban?: string;
  bankBic?: string;
  customMessage?: string;
}): Promise<string> {
  return loadEmailTemplate("invoice-email-modern", {
    ...data,
    clientName: data.clientName,
    customMessage: data.customMessage || "Nous vous adressons la facture ci-jointe.",
  });
}

/**
 * Generate signature request email HTML
 */
export async function generateSignatureRequestEmail(data: {
  clientName: string;
  documentType: string;
  documentNumber: string;
  signatureUrl: string;
  customMessage?: string;
}): Promise<string> {
  return loadEmailTemplate("signature-request-email", {
    ...data,
    clientName: data.clientName,
  });
}

/**
 * Generate payment confirmation email HTML
 */
export async function generatePaymentConfirmationEmail(data: {
  clientName: string;
  documentType: string;
  documentNumber: string;
  amount: string;
  paymentDate: string;
  paymentMethod?: string;
  transactionId?: string;
}): Promise<string> {
  return loadEmailTemplate("payment-confirmation-email", {
    ...data,
    clientName: data.clientName,
  });
}

/**
 * Validate Stripe payment link
 */
export function validateStripeLink(link: string): boolean {
  if (!link) return false;
  
  // Check if it's a valid Stripe checkout URL
  const stripePatterns = [
    /^https:\/\/checkout\.stripe\.com\//, // Stripe Checkout
    /^https:\/\/buy\.stripe\.com\//, // Stripe Payment Links
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/create-payment-session/, // Our Edge Function
  ];

  return stripePatterns.some((pattern) => pattern.test(link));
}

/**
 * Validate signature link
 */
export function validateSignatureLink(link: string): boolean {
  if (!link) return false;

  const signaturePatterns = [
    /^https?:\/\/[^\/]+\/signature\/[a-zA-Z0-9-]+$/, // /signature/:id
    /^https?:\/\/[^\/]+\/signature-quote\/[a-zA-Z0-9-]+$/, // /signature-quote/:id
  ];

  return signaturePatterns.some((pattern) => pattern.test(link));
}

/**
 * Create Stripe payment link for invoice
 */
export async function createStripePaymentLink(
  invoiceId: string,
  amount: number
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-create-payment-link", {
    body: {
      invoice_id: invoiceId,
      amount,
    },
  });

  if (error || !data?.url) {
    throw new Error("Failed to create Stripe payment link");
  }

  if (!validateStripeLink(data.url)) {
    throw new Error("Invalid Stripe payment link generated");
  }

  return data.url;
}

/**
 * Create signature link for document
 * ⚠️ Cette fonction ne doit PAS être utilisée pour les emails
 * Utilisez l'Edge Function create-signature-session qui génère des URLs de production
 */
export function createSignatureLink(
  documentType: "quote" | "invoice",
  documentId: string
): string {
  // Utiliser l'URL de production depuis les variables d'environnement si disponible
  // Sinon, utiliser window.location.origin (pour le développement local uniquement)
  const baseUrl = import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_PRODUCTION_URL || window.location.origin;
  
  // Avertir si on utilise localhost en production
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    console.warn("⚠️ createSignatureLink utilise localhost. Configurez VITE_PUBLIC_URL pour la production.");
  }
  
  const path = documentType === "quote" ? "signature-quote" : "signature";
  return `${baseUrl}/${path}/${documentId}`;
}


