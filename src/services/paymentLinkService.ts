/**
 * Après signature : notification client (plus de page de paiement publique dans l’app).
 * Le lien de règlement est envoyé manuellement par l’artisan / le commercial.
 */

import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "./emailService";

/**
 * @deprecated Les URLs /payment/* ne sont plus servies — préférez un lien Stripe ou autre envoyé manuellement.
 */
export async function generatePaymentLink(
  _quoteId?: string,
  _invoiceId?: string
): Promise<string> {
  return "";
}

/**
 * Envoie un email post-signature sans lien de paiement in-app (message à personnaliser côté client).
 */
export async function sendPaymentLinkAfterSignature(
  signatureId: string
): Promise<void> {
  console.log("💳 [paymentLinkService] Notification après signature:", signatureId);

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

  await supabase
    .from("signatures")
    .update({
      payment_link: null,
      payment_link_sent_at: new Date().toISOString(),
    })
    .eq("id", signatureId);

  const documentType = signature.quote_id ? "devis" : "facture";
  const documentNumber = signature.quote_id ? "DEV-XXX" : "FAC-XXX";

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
          <p>Vous recevrez prochainement un lien ou les modalités de règlement de la part de votre interlocuteur.</p>
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
    subject: `Document signé — ${documentType} ${documentNumber}`,
    html: emailHtml,
    type: "payment_confirmation",
  });

  console.log("✅ [paymentLinkService] Email post-signature envoyé à:", signature.client_email);
}
