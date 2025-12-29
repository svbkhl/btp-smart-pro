/**
 * Service pour générer et gérer les liens de paiement
 */

import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "./emailService";

/**
 * Génère un lien de paiement pour un devis ou une facture
 */
export async function generatePaymentLink(
  quoteId?: string,
  invoiceId?: string
): Promise<string> {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  
  if (quoteId) {
    return `${baseUrl}/payment/quote/${quoteId}`;
  } else if (invoiceId) {
    return `${baseUrl}/payment/invoice/${invoiceId}`;
  }
  
  throw new Error("quoteId ou invoiceId requis");
}

/**
 * Envoie automatiquement le lien de paiement après signature
 */
export async function sendPaymentLinkAfterSignature(
  signatureId: string
): Promise<void> {
  console.log("💳 [paymentLinkService] Envoi du lien de paiement après signature:", signatureId);

  // Récupérer la signature
  const { data: signature, error: sigError } = await supabase
    .from("signatures")
    .select("*")
    .eq("id", signatureId)
    .single();

  if (sigError || !signature) {
    throw new Error("Signature introuvable");
  }

  if (!signature.signed) {
    throw new Error("Le document n'est pas encore signé");
  }

  // Générer le lien de paiement
  const paymentLink = await generatePaymentLink(signature.quote_id || undefined, signature.invoice_id || undefined);

  // Enregistrer le lien dans la signature
  await supabase
    .from("signatures")
    .update({
      payment_link: paymentLink,
      payment_link_sent_at: new Date().toISOString(),
    })
    .eq("id", signatureId);

  // Envoyer l'email avec le lien de paiement
  const documentType = signature.quote_id ? "devis" : "facture";
  const documentNumber = signature.quote_id ? "DEV-XXX" : "FAC-XXX"; // TODO: Récupérer le numéro réel

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Document signé</h1>
        </div>
        <div class="content">
          <p>Bonjour ${signature.client_name || "Client"},</p>
          <p>Merci d'avoir signé le ${documentType} ${documentNumber}.</p>
          <p>Vous pouvez maintenant procéder au paiement en cliquant sur le lien ci-dessous :</p>
          <div style="text-align: center;">
            <a href="${paymentLink}" class="button">Payer maintenant</a>
          </div>
          <p>Ou copiez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; color: #2563eb;">${paymentLink}</p>
          <p>Cordialement,<br>L'équipe</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: signature.client_email,
    subject: `Lien de paiement - ${documentType} ${documentNumber}`,
    html: emailHtml,
    type: "payment_confirmation",
  });

  console.log("✅ [paymentLinkService] Lien de paiement envoyé à:", signature.client_email);
}










