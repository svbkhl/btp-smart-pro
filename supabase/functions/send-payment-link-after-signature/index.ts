/**
 * Edge Function pour envoyer automatiquement le lien de paiement après signature
 * Appelée automatiquement quand une signature est complétée
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Utiliser service_role pour les opérations automatiques
      {
        global: {
          headers: { Authorization: authHeader || "" },
        },
      }
    );

    const body = await req.json();
    const { signature_id } = body;

    if (!signature_id) {
      return new Response(
        JSON.stringify({ error: "signature_id is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("💳 [send-payment-link-after-signature] Traitement pour signature:", signature_id);

    // Récupérer la signature
    const { data: signature, error: sigError } = await supabaseClient
      .from("signatures")
      .select("*")
      .eq("id", signature_id)
      .single();

    if (sigError || !signature) {
      console.error("❌ [send-payment-link-after-signature] Signature non trouvée:", sigError);
      return new Response(
        JSON.stringify({ error: "Signature not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    if (!signature.signed) {
      return new Response(
        JSON.stringify({ error: "Document not signed yet" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Récupérer les informations du devis/facture et du propriétaire
    let document: any = null;
    let documentType = "document";
    let documentNumber = "N/A";
    let quoteOwnerId: string | null = null;

    if (signature.quote_id) {
      const { data: quote } = await supabaseClient
        .from("ai_quotes")
        .select("quote_number, estimated_cost, client_name, user_id")
        .eq("id", signature.quote_id)
        .single();

      if (quote) {
        document = quote;
        documentType = "devis";
        documentNumber = quote.quote_number || "N/A";
        quoteOwnerId = quote.user_id;
      }
    } else if (signature.invoice_id) {
      const { data: invoice } = await supabaseClient
        .from("invoices")
        .select("invoice_number, amount_ttc, client_name, user_id")
        .eq("id", signature.invoice_id)
        .single();

      if (invoice) {
        document = invoice;
        documentType = "facture";
        documentNumber = invoice.invoice_number || "N/A";
        quoteOwnerId = invoice.user_id;
      }
    }

    // Vérifier les préférences utilisateur pour le paiement conditionnel
    if (!quoteOwnerId) {
      return new Response(
        JSON.stringify({ error: "Document owner not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const { data: userSettings, error: settingsError } = await supabaseClient
      .from("user_settings")
      .select("payment_enabled, payment_provider")
      .eq("user_id", quoteOwnerId)
      .single();

    if (settingsError || !userSettings) {
      console.warn("⚠️ [send-payment-link-after-signature] Paramètres utilisateur non trouvés:", settingsError);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Signature completed, but payment is not configured",
          payment_enabled: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Si le paiement n'est pas activé ou le provider n'est pas configuré, ne pas envoyer de lien
    if (!userSettings.payment_enabled || !userSettings.payment_provider) {
      console.log("ℹ️ [send-payment-link-after-signature] Paiement non activé ou provider non configuré");
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Signature completed, payment not enabled",
          payment_enabled: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Générer le lien de paiement
    const baseUrl = Deno.env.get("VITE_APP_URL") || "https://votre-app.com";
    const paymentId = crypto.randomUUID();
    const paymentLink = signature.quote_id
      ? `${baseUrl}/payment/quote/${signature.quote_id}?token=${paymentId}`
      : `${baseUrl}/payment/invoice/${signature.invoice_id}?token=${paymentId}`;

    // Créer l'entrée dans la table payments
    const paymentAmount = document?.estimated_cost || document?.amount_ttc || null;
    
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        id: paymentId,
        quote_id: signature.quote_id || null,
        invoice_id: signature.invoice_id || null,
        client_email: signature.client_email,
        client_name: signature.client_name || null,
        payment_link: paymentLink,
        payment_provider: userSettings.payment_provider,
        payment_amount: paymentAmount,
        payment_currency: "EUR",
        paid: false,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("❌ [send-payment-link-after-signature] Erreur création paiement:", paymentError);
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    console.log("✅ [send-payment-link-after-signature] Paiement créé:", payment.id);

    // Générer le HTML de l'email
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

    // Envoyer l'email via l'Edge Function send-email
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Utiliser le service_role pour appeler send-email
    const sendEmailResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: signature.client_email,
          subject: `Lien de paiement - ${documentType} ${documentNumber}`,
          html: emailHtml,
          type: "payment_confirmation",
        }),
      }
    );

    if (!sendEmailResponse.ok) {
      const errorData = await sendEmailResponse.json();
      console.error("❌ [send-payment-link-after-signature] Erreur envoi email:", errorData);
      throw new Error(`Failed to send email: ${errorData.error || "Unknown error"}`);
    }

    console.log("✅ [send-payment-link-after-signature] Lien de paiement envoyé à:", signature.client_email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment link sent successfully",
        payment_link: paymentLink,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ [send-payment-link-after-signature] Erreur:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

