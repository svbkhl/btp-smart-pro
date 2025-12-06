import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
  includePDF?: boolean;
  customMessage?: string;
}

interface EmailAttachment {
  filename: string;
  content: string; // Base64
  type: string;
}

/**
 * Envoie un email via SMTP en utilisant les credentials de l'utilisateur
 * Utilise Resend avec le domaine vérifié ou l'email de l'utilisateur
 */
async function sendViaSMTP(
  settings: any,
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments: EmailAttachment[] = []
): Promise<{ success: boolean; email_id?: string; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  // RESEND_FROM_EMAIL peut être au format "Name <email@domain.com>" ou juste "email@domain.com"
  const RESEND_FROM_EMAIL_RAW = Deno.env.get("RESEND_FROM_EMAIL") || "contact@btpsmartpro.com";
  const FROM_NAME = Deno.env.get("FROM_NAME") || "BTP Smart Pro";

  // Parser RESEND_FROM_EMAIL pour extraire le nom et l'email
  function parseFromEmail(fromEmailRaw: string): { name: string | null; email: string } {
    // Si le format est "Name <email@domain.com>"
    const match = fromEmailRaw.match(/^"?(.+?)"?\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }
    // Sinon, c'est juste l'email
    return {
      name: null,
      email: fromEmailRaw.trim(),
    };
  }

  const parsedFromEmail = parseFromEmail(RESEND_FROM_EMAIL_RAW);
  const RESEND_FROM_EMAIL = parsedFromEmail.email;
  const RESEND_FROM_NAME = parsedFromEmail.name || FROM_NAME;

  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY non configuré. Configurez la clé API Resend dans Supabase Secrets.");
  }

  // Déterminer l'adresse "from" à utiliser
  // 1. Si l'utilisateur a configuré from_email, l'utiliser
  // 2. Sinon, utiliser smtp_user (son email)
  // 3. Sinon, utiliser RESEND_FROM_EMAIL comme fallback
  let fromEmail = settings.from_email || settings.smtp_user || RESEND_FROM_EMAIL;
  // Utiliser le nom depuis RESEND_FROM_EMAIL si configuré, sinon depuis settings, sinon depuis FROM_NAME
  const fromName = settings.from_name || RESEND_FROM_NAME;

  // Vérifier que l'email "from" est valide
  if (!fromEmail || !fromEmail.includes("@")) {
    console.warn("⚠️ Email 'from' invalide, utilisation du fallback:", fromEmail);
    fromEmail = RESEND_FROM_EMAIL;
  }

  // Vérifier si l'email de l'utilisateur est d'un domaine vérifié
  // Si ce n'est pas le cas, utiliser RESEND_FROM_EMAIL
  const userEmailDomain = fromEmail.split("@")[1];
  const verifiedDomain = RESEND_FROM_EMAIL.split("@")[1];
  
  // Si l'email de l'utilisateur n'est pas du domaine vérifié, utiliser le fallback
  // mais garder le Reply-To avec l'email de l'utilisateur
  const useUserEmail = userEmailDomain === verifiedDomain;
  const finalFromEmail = useUserEmail ? fromEmail : RESEND_FROM_EMAIL;
  const replyTo = useUserEmail ? undefined : fromEmail;

  console.log("📧 [sendViaSMTP] Configuration email:", {
    userEmail: fromEmail,
    finalFromEmail,
    replyTo,
    useUserEmail,
    verifiedDomain,
  });

  // Valider l'email "from"
  if (!finalFromEmail || !finalFromEmail.includes("@")) {
    throw new Error(`Email 'from' invalide: ${finalFromEmail}. Configurez RESEND_FROM_EMAIL dans Supabase Secrets.`);
  }

  // Nettoyer le nom pour éviter les caractères qui cassent le format
  const cleanFromName = fromName 
    ? fromName.replace(/[<>]/g, "").trim() // Enlever les < et > du nom
    : null;

  // Construire le champ "from" au format Resend
  // Format attendu: "Name <email@example.com>" ou "email@example.com"
  const formattedFrom = cleanFromName 
    ? `${cleanFromName} <${finalFromEmail}>`
    : finalFromEmail;

  console.log("📧 [sendViaSMTP] Champ 'from' formaté:", formattedFrom);

  try {
    const emailData: any = {
      from: formattedFrom,
      to: [to],
      subject,
      html,
      text,
    };

    // Ajouter Reply-To si différent de "from"
    if (replyTo && replyTo !== finalFromEmail) {
      emailData.reply_to = replyTo;
      console.log("📧 [sendViaSMTP] Reply-To configuré:", replyTo);
    }

    // Ajouter les attachments
    if (attachments.length > 0) {
      emailData.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        type: att.type,
      }));
    }

    console.log("📤 [sendViaSMTP] Envoi via Resend:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: attachments.length > 0,
      replyTo: emailData.reply_to,
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = data.message || data.error?.message || "Failed to send email via Resend";
      
      // Messages d'erreur plus clairs
      if (errorMsg.includes("domain is not verified") || errorMsg.includes("not verified")) {
        errorMsg = `Le domaine "${userEmailDomain}" n'est pas vérifié sur Resend. ` +
          `Utilisation de "${verifiedDomain}" comme adresse d'envoi. ` +
          `L'email de l'utilisateur sera dans le Reply-To. ` +
          `Pour utiliser votre propre domaine, vérifiez-le sur https://resend.com/domains`;
      } else if (errorMsg.includes("only send testing emails")) {
        errorMsg = `Vous utilisez une clé API de test. ` +
          `Configurez RESEND_API_KEY avec une clé API de production dans Supabase Secrets.`;
      }

      console.error("❌ [sendViaSMTP] Erreur Resend:", errorMsg, data);
      throw new Error(errorMsg);
    }

    console.log("✅ [sendViaSMTP] Email envoyé avec succès:", data.id);
    return { success: true, email_id: data.id };
  } catch (error: any) {
    console.error("❌ [sendViaSMTP] Erreur:", error);
    throw error;
  }
}

/**
 * Envoie un email via Gmail OAuth
 */
async function sendViaGmailOAuth(
  settings: any,
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments: EmailAttachment[] = []
): Promise<{ success: boolean; email_id?: string; error?: string }> {
  const { oauth_access_token, oauth_refresh_token, smtp_user } = settings;

  if (!oauth_access_token && !oauth_refresh_token) {
    throw new Error("Token OAuth Gmail non configuré. Veuillez reconnecter votre compte Gmail.");
  }

  // TODO: Implémenter l'envoi via Gmail API
  // Pour l'instant, utiliser SMTP avec le token OAuth
  // Note: Gmail API nécessite une implémentation plus complexe avec refresh token
  
  throw new Error(
    "L'envoi via Gmail OAuth n'est pas encore implémenté. Utilisez SMTP avec un mot de passe d'application pour l'instant."
  );
}

/**
 * Envoie un email via Outlook OAuth
 */
async function sendViaOutlookOAuth(
  settings: any,
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments: EmailAttachment[] = []
): Promise<{ success: boolean; email_id?: string; error?: string }> {
  const { oauth_access_token, oauth_refresh_token, smtp_user } = settings;

  if (!oauth_access_token && !oauth_refresh_token) {
    throw new Error("Token OAuth Outlook non configuré. Veuillez reconnecter votre compte Outlook.");
  }

  // TODO: Implémenter l'envoi via Microsoft Graph API
  // Pour l'instant, utiliser SMTP avec le token OAuth
  
  throw new Error(
    "L'envoi via Outlook OAuth n'est pas encore implémenté. Utilisez SMTP avec votre mot de passe pour l'instant."
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📧 [send-email-from-user] Début de la requête");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ [send-email-from-user] No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from session
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("❌ [send-email-from-user] Unauthorized:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", details: userError?.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log("✅ [send-email-from-user] Utilisateur authentifié:", user.id);

    // Parse request body
    let body: SendEmailRequest;
    try {
      const rawBody = await req.text();
      body = JSON.parse(rawBody);
      console.log("📥 [send-email-from-user] Body reçu:", {
        quoteId: body.quoteId,
        quoteNumber: body.quoteNumber,
        clientEmail: body.clientEmail,
        includePDF: body.includePDF,
      });
    } catch (parseError: any) {
      console.error("❌ [send-email-from-user] Error parsing body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body", details: parseError?.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { quoteId, quoteNumber, clientEmail, clientName, includePDF = true, customMessage } = body;

    // Validation
    if (!quoteId || !quoteNumber || !clientEmail || !clientName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: quoteId, quoteNumber, clientEmail, clientName" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 1️⃣ Récupérer les settings email de l'utilisateur
    console.log("🔍 [send-email-from-user] Récupération des settings email...");
    const { data: emailSettings, error: settingsError } = await supabaseClient
      .from("user_email_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !emailSettings) {
      console.error("❌ [send-email-from-user] Settings email non trouvés:", settingsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuration email non trouvée",
          details: "Veuillez configurer votre compte email dans les paramètres avant d'envoyer des emails.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("✅ [send-email-from-user] Settings email récupérés:", {
      provider: emailSettings.provider,
      from_email: emailSettings.from_email || emailSettings.smtp_user,
    });

    // 2️⃣ Récupérer les informations du devis
    console.log("🔍 [send-email-from-user] Récupération du devis...");
    const { data: quote, error: quoteError } = await supabaseClient
      .from("ai_quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("user_id", user.id)
      .single();

    if (quoteError || !quote) {
      console.error("❌ [send-email-from-user] Devis non trouvé:", quoteError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Devis non trouvé",
          details: quoteError?.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    console.log("✅ [send-email-from-user] Devis récupéré:", quoteNumber);

    // 3️⃣ Récupérer les informations de l'entreprise pour le PDF
    console.log("🔍 [send-email-from-user] Récupération des infos entreprise...");
    const { data: companySettings } = await supabaseClient
      .from("user_settings")
      .select("company_name, email, phone, address, city, postal_code, country, siret, vat_number, signature_name")
      .eq("user_id", user.id)
      .single();

    // 4️⃣ Générer le PDF si demandé
    let pdfAttachment: EmailAttachment | null = null;
    if (includePDF) {
      try {
        console.log("📄 [send-email-from-user] Génération du PDF...");
        
        // Appeler l'Edge Function de génération de PDF
        const pdfResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-quote-pdf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify({
              quoteId,
              quoteNumber,
              clientName,
              clientEmail,
              companySettings,
            }),
          }
        );

        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json();
          pdfAttachment = {
            filename: `Devis-${quoteNumber}.pdf`,
            content: pdfData.base64,
            type: "application/pdf",
          };
          console.log("✅ [send-email-from-user] PDF généré avec succès");
        } else {
          console.warn("⚠️ [send-email-from-user] Échec génération PDF, continuation sans PDF");
        }
      } catch (pdfError: any) {
        console.warn("⚠️ [send-email-from-user] Erreur génération PDF:", pdfError.message);
        // Continuer sans PDF
      }
    }

    // 5️⃣ Générer le contenu HTML de l'email
    console.log("📝 [send-email-from-user] Génération du contenu email...");
    const emailHtml = generateQuoteEmailHTML({
      quoteNumber,
      clientName,
      customMessage,
      companyName: companySettings?.company_name || "BTP Smart Pro",
    });

    const emailText = generateQuoteEmailText({
      quoteNumber,
      clientName,
      customMessage,
      companyName: companySettings?.company_name || "BTP Smart Pro",
    });

    // 6️⃣ Préparer les attachments
    const attachments: EmailAttachment[] = [];
    if (pdfAttachment) {
      attachments.push(pdfAttachment);
    }

    // 7️⃣ Envoyer l'email selon le provider
    console.log("📤 [send-email-from-user] Envoi de l'email via", emailSettings.provider);
    let result: { success: boolean; email_id?: string; error?: string };

    try {
      switch (emailSettings.provider) {
        case "gmail":
          result = await sendViaGmailOAuth(
            emailSettings,
            clientEmail,
            `Devis ${quoteNumber} - ${clientName}`,
            emailHtml,
            emailText,
            attachments
          );
          break;

        case "outlook":
          result = await sendViaOutlookOAuth(
            emailSettings,
            clientEmail,
            `Devis ${quoteNumber} - ${clientName}`,
            emailHtml,
            emailText,
            attachments
          );
          break;

        case "smtp":
        case "resend":
        case "gmail": // Gmail utilise aussi SMTP via Resend pour l'instant
        case "outlook": // Outlook utilise aussi SMTP via Resend pour l'instant
        default:
          // Pour tous les providers, utiliser Resend avec le domaine vérifié
          // L'email de l'utilisateur sera dans le Reply-To si différent
          result = await sendViaSMTP(
            emailSettings,
            clientEmail,
            `Devis ${quoteNumber} - ${clientName}`,
            emailHtml,
            emailText,
            attachments
          );
          break;
      }

      if (result.success) {
        console.log("✅ [send-email-from-user] Email envoyé avec succès:", result.email_id);

        // Mettre à jour le statut du devis
        await supabaseClient
          .from("ai_quotes")
          .update({
            email_sent_at: new Date().toISOString(),
            status: "sent",
          })
          .eq("id", quoteId)
          .eq("user_id", user.id);

        // Logger l'email
        await supabaseClient.from("email_messages").insert({
          user_id: user.id,
          recipient_email: clientEmail,
          subject: `Devis ${quoteNumber} - ${clientName}`,
          body_html: emailHtml,
          body_text: emailText,
          email_type: "quote",
          status: "sent",
          external_id: result.email_id,
          sent_at: new Date().toISOString(),
          quote_id: quoteId,
        });

        return new Response(
          JSON.stringify({
            success: true,
            email_id: result.email_id,
            message: "Email envoyé avec succès",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } else {
        throw new Error(result.error || "Échec d'envoi de l'email");
      }
    } catch (error: any) {
      console.error("❌ [send-email-from-user] Erreur envoi email:", error);

      // Logger l'erreur
      await supabaseClient.from("email_messages").insert({
        user_id: user.id,
        recipient_email: clientEmail,
        subject: `Devis ${quoteNumber} - ${clientName}`,
        body_html: emailHtml,
        body_text: emailText,
        email_type: "quote",
        status: "failed",
        error_message: error.message,
        quote_id: quoteId,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Échec d'envoi de l'email",
          details: error.stack || {},
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error: any) {
    console.error("❌ [send-email-from-user] Erreur non gérée:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        details: error.stack || {},
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/**
 * Génère le HTML de l'email de devis
 */
function generateQuoteEmailHTML(params: {
  quoteNumber: string;
  clientName: string;
  customMessage?: string;
  companyName: string;
}): string {
  const { quoteNumber, clientName, customMessage, companyName } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Devis ${quoteNumber}</h1>
    </div>
    <div class="content">
      <p>Bonjour ${clientName},</p>
      <p>Vous trouverez ci-joint le devis ${quoteNumber}.</p>
      ${customMessage ? `<p>${customMessage}</p>` : ""}
      <p>N'hésitez pas à nous contacter pour toute question.</p>
      <p>Cordialement,<br>${companyName}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement depuis ${companyName}.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Génère le texte brut de l'email de devis
 */
function generateQuoteEmailText(params: {
  quoteNumber: string;
  clientName: string;
  customMessage?: string;
  companyName: string;
}): string {
  const { quoteNumber, clientName, customMessage, companyName } = params;

  return `
Devis ${quoteNumber}

Bonjour ${clientName},

Vous trouverez ci-joint le devis ${quoteNumber}.

${customMessage ? customMessage + "\n\n" : ""}N'hésitez pas à nous contacter pour toute question.

Cordialement,
${companyName}

---
Cet email a été envoyé automatiquement depuis ${companyName}.
  `.trim();
}

