import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration Resend
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const FROM_NAME = Deno.env.get("FROM_NAME") || "BTP Smart Pro";

interface EmailAttachment {
  filename: string;
  content: string; // Base64
  type: string;
}

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: string;
  attachments?: EmailAttachment[];
  template?: string;
  invoice_id?: string;
  quote_id?: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
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
      console.error("❌ Unauthorized:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Parse request body
    let body: SendEmailRequest;
    try {
      const rawBody = await req.text();
      console.log("📥 Raw request body (first 1000 chars):", rawBody.substring(0, 1000));
      console.log("📥 Raw request body length:", rawBody.length);
      
      if (!rawBody || rawBody.trim().length === 0) {
        console.error("❌ Empty request body");
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      body = JSON.parse(rawBody);
      console.log("📥 Parsed request body keys:", Object.keys(body));
      console.log("📥 Parsed request body:", { 
        to: body.to, 
        subject: body.subject, 
        hasHtml: !!body.html,
        hasText: !!body.text,
        htmlLength: body.html?.length || 0,
        textLength: body.text?.length || 0,
        type: body.type,
        allKeys: Object.keys(body)
      });
    } catch (parseError: any) {
      console.error("❌ Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", details: parseError?.message || String(parseError) }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const {
      to,
      subject,
      html,
      text,
      type = "notification",
      attachments = [],
      template,
      invoice_id,
      quote_id,
      replyTo,
      cc,
      bcc,
    } = body;

    if (!to || !subject) {
      console.error("❌ Missing required fields:", { to: !!to, subject: !!subject });
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!html && !text) {
      console.error("❌ Missing email content: both html and text are missing", { html: !!html, text: !!text, bodyKeys: Object.keys(body) });
      return new Response(
        JSON.stringify({ error: "Missing email content: either html or text is required", received: { hasHtml: !!html, hasText: !!text } }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get email configuration from user_email_settings
    const { data: emailConfig, error: emailConfigError } = await supabaseClient
      .from("user_email_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (emailConfigError && emailConfigError.code !== "PGRST116") {
      // PGRST116 means no row found, which is OK (will use defaults)
      console.error("❌ Error fetching user_email_settings:", emailConfigError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve email configuration", details: emailConfigError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Get user settings for signature
    const { data: settings, error: settingsError } = await supabaseClient
      .from("user_settings")
      .select("company_name, signature_name, email, phone, signature_data")
      .eq("user_id", user.id)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      // PGRST116 means no row found, which is OK (will use defaults)
      console.error("❌ Error fetching user_settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve user settings", details: settingsError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Generate signature HTML and Text
    const signatureHtml = generateEmailSignature(settings);
    const signatureText = generateEmailSignatureText(settings);

    // Prepare email content with signature
    let htmlWithSignature: string | undefined;
    let textWithSignature: string | undefined;

    if (html) {
      htmlWithSignature = `${html}\n\n${signatureHtml}`;
    } else if (text) {
      // If only text provided, use it as HTML too (basic)
      htmlWithSignature = `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${text.replace(/\n/g, '<br>')}</pre>\n\n${signatureHtml}`;
    }

    if (text) {
      textWithSignature = `${text}\n\n${signatureText}`;
    } else if (html) {
      // If only HTML provided, extract text from it
      const textFromHtml = html.replace(/<[^>]*>/g, "").replace(/\n\s*\n/g, "\n").trim();
      textWithSignature = `${textFromHtml}\n\n${signatureText}`;
    }

    // Ensure we have at least one content type
    if (!htmlWithSignature && !textWithSignature) {
      console.error("❌ No email content available after processing");
      return new Response(
        JSON.stringify({ error: "No email content available after processing" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Prepare email data
    // Use user's email configuration if available, otherwise use default
    let fromEmail = emailConfig?.from_email || emailConfig?.smtp_user || FROM_EMAIL;
    const fromName = emailConfig?.from_name || settings?.signature_name || FROM_NAME;

    // Valider et nettoyer l'email "from"
    if (!fromEmail || !fromEmail.includes("@")) {
      console.error("❌ Invalid from_email:", fromEmail);
      return new Response(
        JSON.stringify({ 
          error: "Invalid from_email configuration", 
          details: "L'adresse email 'from' n'est pas valide. Configurez une adresse email valide dans les paramètres." 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Si on utilise Resend et que l'email n'est pas d'un domaine vérifié, utiliser un email par défaut
    // Resend permet d'utiliser "onboarding@resend.dev" pour les tests, ou un domaine vérifié
    const isGmailOrOutlook = fromEmail.includes("@gmail.com") || fromEmail.includes("@outlook.com") || fromEmail.includes("@hotmail.com") || fromEmail.includes("@yahoo.com");
    let resendFromEmail = fromEmail;
    
    // Toujours utiliser un email par défaut pour Gmail/Outlook si on utilise Resend
    if (isGmailOrOutlook) {
      // Utiliser un email par défaut de Resend
      // Resend permet d'utiliser "onboarding@resend.dev" pour les tests
      resendFromEmail = FROM_EMAIL;
      console.log(`⚠️ Email Gmail/Outlook détecté (${fromEmail}), utilisation de ${resendFromEmail} pour Resend`);
      console.log(`⚠️ RESEND_API_KEY configuré: ${RESEND_API_KEY ? "Oui" : "Non"}`);
    }

    // Resend accepte le format "Name <email@domain.com>" ou juste "email@domain.com"
    // Utiliser resendFromEmail pour Resend si le domaine original n'est pas vérifié
    const emailData: any = {
      from: fromName ? `${fromName} <${resendFromEmail}>` : resendFromEmail,
      to: [to],
      subject: subject,
    };
    
    // Ajouter un Reply-To avec l'email original si différent
    if (resendFromEmail !== fromEmail) {
      emailData.reply_to = fromEmail;
      console.log(`📧 Reply-To configuré avec l'email original: ${fromEmail}`);
    }

    // Add HTML or text content
    if (htmlWithSignature) {
      emailData.html = htmlWithSignature;
    }
    if (textWithSignature) {
      emailData.text = textWithSignature;
    }

    // Add optional fields
    if (replyTo) emailData.reply_to = replyTo;
    if (cc) emailData.cc = [cc];
    if (bcc) emailData.bcc = [bcc];

    // Add attachments if present
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        type: att.type,
      }));
    }

    let emailId: string | null = null;
    let emailStatus: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    // Détecter si l'utilisateur a configuré SMTP (Gmail/Outlook)
    const hasSMTPConfig = emailConfig && (
      (emailConfig.provider === "gmail" || emailConfig.provider === "outlook") &&
      emailConfig.smtp_host &&
      emailConfig.smtp_port &&
      emailConfig.smtp_user &&
      emailConfig.smtp_password
    );

    // Si SMTP est configuré, essayer d'utiliser SMTP directement
    // Sinon, utiliser Resend si disponible
    if (hasSMTPConfig) {
      try {
        console.log("📧 Tentative d'envoi via SMTP:", emailConfig.smtp_host);
        await sendViaSMTP({
          host: emailConfig.smtp_host!,
          port: parseInt(emailConfig.smtp_port!.toString()),
          user: emailConfig.smtp_user!,
          password: emailConfig.smtp_password!,
          from: fromEmail,
          fromName: fromName,
          to: to,
          subject: subject,
          html: htmlWithSignature,
          text: textWithSignature,
        });
        emailId = `smtp-${Date.now()}`;
        emailStatus = "sent";
        console.log("✅ Email sent successfully via SMTP");
      } catch (error: any) {
        console.error("❌ Error sending email via SMTP:", error);
        // Si SMTP échoue, essayer Resend en fallback si disponible
        if (RESEND_API_KEY) {
          console.log("📧 Fallback vers Resend après échec SMTP");
          try {
            // Utiliser resendFromEmail pour Resend si le domaine original n'est pas vérifié
            const resendEmailData = {
              ...emailData,
              from: fromName ? `${fromName} <${resendFromEmail}>` : resendFromEmail,
            };
            
            // Ajouter Reply-To avec l'email original si différent
            if (resendFromEmail !== fromEmail) {
              resendEmailData.reply_to = fromEmail;
              console.log(`📧 Reply-To configuré avec l'email original: ${fromEmail}`);
            }
            
            const resendResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify(resendEmailData),
            });

            const resendData = await resendResponse.json();
            console.log("📧 Resend API response (fallback):", {
              status: resendResponse.status,
              ok: resendResponse.ok,
              data: resendData,
            });

            if (!resendResponse.ok) {
              let errorMsg = resendData.message || resendData.error?.message || "Failed to send email via Resend";
              if (errorMsg.includes("domain is not verified") || errorMsg.includes("not verified")) {
                errorMsg = `Le domaine de l'adresse email "${fromEmail}" n'est pas vérifié sur Resend. ` +
                  `Options : 1) Vérifiez votre domaine sur https://resend.com/domains, ` +
                  `2) Utilisez une adresse email d'un domaine vérifié, ` +
                  `3) Vérifiez votre configuration SMTP (Gmail/Outlook nécessite un "App Password").`;
              }
              throw new Error(errorMsg);
            }

            emailId = resendData.id;
            emailStatus = "sent";
            console.log("✅ Email sent successfully via Resend (fallback):", emailId);
            errorMessage = null; // Clear error since Resend succeeded
          } catch (resendError: any) {
            emailStatus = "failed";
            errorMessage = `SMTP échoué: ${error?.message || "Unknown SMTP error"}. ` +
              `Resend fallback échoué: ${resendError?.message || "Unknown Resend error"}. ` +
              `Vérifiez votre configuration SMTP (Gmail/Outlook nécessite un "App Password") ou configurez Resend avec un domaine vérifié.`;
          }
        } else {
          emailStatus = "failed";
          errorMessage = error?.message || error?.toString() || "Unknown SMTP error";
          // Si c'est l'erreur de non-implémentation, donner des instructions claires
          if (errorMessage.includes("n'est pas encore implémenté") || errorMessage.includes("SMTP direct")) {
            errorMessage = "L'envoi SMTP direct n'est pas encore disponible. " +
              "Options : 1) Utilisez Resend avec votre propre domaine vérifié, " +
              "2) Configurez Mailgun (MAILGUN_API_KEY et MAILGUN_DOMAIN), " +
              "3) Utilisez l'API Gmail avec OAuth2 (à venir).";
          }
        }
      }
    } else if (RESEND_API_KEY) {
      // Send email via Resend if API key is configured and no SMTP config
      try {
        console.log("📧 Envoi via Resend depuis:", resendFromEmail);
        console.log("📧 Email original:", fromEmail);
        console.log("📧 Email data:", JSON.stringify({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          hasHtml: !!emailData.html,
          hasText: !!emailData.text,
          replyTo: emailData.reply_to,
        }));
        
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailData),
        });

        const resendData = await resendResponse.json();
        console.log("📧 Resend API response:", {
          status: resendResponse.status,
          ok: resendResponse.ok,
          data: resendData,
        });

        if (!resendResponse.ok) {
          let errorMsg = resendData.message || resendData.error?.message || "Failed to send email via Resend";
          
          // Message d'erreur plus clair pour les domaines non vérifiés
          if (errorMsg.includes("domain is not verified") || errorMsg.includes("not verified")) {
            errorMsg = `Le domaine de l'adresse email "${resendFromEmail}" n'est pas vérifié sur Resend. ` +
              `Email original: ${fromEmail}. ` +
              `Options : 1) Configurez FROM_EMAIL dans Supabase avec un domaine vérifié, ` +
              `2) Vérifiez votre domaine sur https://resend.com/domains, ` +
              `3) Assurez-vous que RESEND_API_KEY est configuré dans Supabase.`;
            console.error(`❌ Resend error details:`, {
              fromEmail,
              resendFromEmail,
              emailDataFrom: emailData.from,
              resendResponse: resendData,
            });
          }
          
          console.error("❌ Resend API error:", errorMsg, resendData);
          throw new Error(errorMsg);
        }

        emailId = resendData.id;
        emailStatus = "sent";
        console.log("✅ Email sent successfully via Resend:", emailId);
      } catch (error: any) {
        console.error("❌ Error sending email via Resend:", error);
        emailStatus = "failed";
        errorMessage = error?.message || error?.toString() || "Unknown error from Resend";
        // Ne pas throw ici, on continue pour logger l'email en base
      }
    } else {
      console.warn("⚠️ RESEND_API_KEY not configured. Email will be logged but not sent.");
      emailStatus = "failed";
      errorMessage = "RESEND_API_KEY not configured. Configurez Resend dans les variables d'environnement de Supabase.";
    }

    // Log email message in database
    try {
      await supabaseClient.from("email_messages").insert({
        user_id: user.id,
        recipient_email: to,
        subject,
        body_html: htmlWithSignature || null,
        body_text: textWithSignature || text || null,
        email_type: type,
        status: emailStatus,
        external_id: emailId,
        error_message: errorMessage,
        sent_at: emailStatus === "sent" ? new Date().toISOString() : null,
        invoice_id: invoice_id || null,
        quote_id: quote_id || null,
      });
    } catch (error) {
      console.warn("⚠️ Could not log email message:", error);
    }

    // Update document status if invoice_id or quote_id provided
    if (emailStatus === "sent") {
      if (invoice_id) {
        await supabaseClient
          .from("invoices")
          .update({
            email_sent_at: new Date().toISOString(),
            status: "sent",
          })
          .eq("id", invoice_id)
          .eq("user_id", user.id);
      } else if (quote_id) {
        await supabaseClient
          .from("ai_quotes")
          .update({
            email_sent_at: new Date().toISOString(),
            status: "sent",
          })
          .eq("id", quote_id)
          .eq("user_id", user.id);
      }
    }

    // Si l'email a échoué, retourner une erreur 500 avec les détails
    if (emailStatus === "failed") {
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage || "Email failed to send",
          message: "L'envoi de l'email a échoué. Vérifiez votre configuration Resend ou SMTP.",
          email_id: emailId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        email_id: emailId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Uncaught error in send-email Edge Function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails = error?.details || error?.context || {};
    
    return new Response(
      JSON.stringify({
        error: errorMessage || "Failed to send email",
        details: errorStack || errorDetails,
        type: error?.name || typeof error,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: errorMessage.includes("Unauthorized") || errorMessage.includes("authorization") ? 401 : 
                errorMessage.includes("Missing") || errorMessage.includes("Invalid") ? 400 : 500,
      }
    );
  }
});

/**
 * Generate professional email signature HTML
 */
function generateEmailSignature(settings: any): string {
  const companyName = settings?.company_name || "BTP Smart Pro";
  const name = settings?.signature_name || "";
  const email = settings?.email || "";
  const phone = settings?.phone || "";
  const customSignature = settings?.signature_data || "";

  if (customSignature && customSignature.trim()) {
    return `\n\n<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />\n<div style="font-family: Arial, sans-serif; font-size: 12px; color: #6b7280;">${customSignature.replace(/\n/g, '<br>')}</div>`;
  }

  let signature = `\n\n<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />\n<div style="font-family: Arial, sans-serif; font-size: 12px; color: #6b7280;">`;
  if (name) signature += `<strong>${name}</strong><br>`;
  signature += `${companyName}<br>`;
  if (email) signature += `Email: <a href="mailto:${email}" style="color: #2563eb;">${email}</a><br>`;
  if (phone) signature += `Tél: ${phone}<br>`;
  signature += `</div>`;
  return signature;
}

/**
 * Generate professional email signature text
 */
function generateEmailSignatureText(settings: any): string {
  const companyName = settings?.company_name || "BTP Smart Pro";
  const name = settings?.signature_name || "";
  const email = settings?.email || "";
  const phone = settings?.phone || "";
  const customSignature = settings?.signature_data || "";

  if (customSignature && customSignature.trim()) {
    return `\n\n--\n${customSignature}\n`;
  }

  let signature = "\n\n--\n";
  if (name) signature += `${name}\n`;
  signature += `${companyName}\n`;
  if (email) signature += `Email: ${email}\n`;
  if (phone) signature += `Tél: ${phone}\n`;
  signature += "\nCe message et toutes les pièces jointes sont confidentiels.";
  return signature;
}

/**
 * Envoie un email via SMTP directement
 * Utilise Mailgun si configuré, sinon utilise une bibliothèque SMTP pour Deno
 */
async function sendViaSMTP(params: {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<void> {
  // Option 1 : Utiliser Mailgun (si configuré) - plus fiable pour l'envoi SMTP
  const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
  const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
  
  if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
    try {
      const formData = new FormData();
      formData.append("from", params.fromName ? `${params.fromName} <${params.from}>` : params.from);
      formData.append("to", params.to);
      formData.append("subject", params.subject);
      if (params.html) formData.append("html", params.html);
      if (params.text) formData.append("text", params.text);
      
      const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mailgun error: ${error}`);
      }
      
      console.log("✅ Email sent via Mailgun");
      return;
    } catch (error: any) {
      console.error("❌ Mailgun error:", error);
      throw error;
    }
  }
  
  // Option 2 : Utiliser une bibliothèque SMTP pour Deno
  // Note: Deno Edge Functions ne supportent pas directement les connexions TCP/SMTP
  // Il faut utiliser un service proxy ou une API HTTP comme Mailgun ou Resend
  
  // Pour Gmail/Outlook, l'envoi SMTP direct n'est pas possible dans les Edge Functions
  // Solutions recommandées :
  // 1. Utiliser Mailgun (si configuré avec MAILGUN_API_KEY et MAILGUN_DOMAIN)
  // 2. Utiliser Resend avec un domaine vérifié
  // 3. Utiliser l'API Gmail avec OAuth2 (nécessite une implémentation supplémentaire)
  
  throw new Error(
    "L'envoi SMTP direct n'est pas disponible dans les Edge Functions Deno. " +
    "Pour utiliser Gmail/Outlook, configurez Mailgun (MAILGUN_API_KEY et MAILGUN_DOMAIN) " +
    "ou utilisez Resend avec un domaine vérifié. " +
    "Le système essaiera automatiquement Resend en fallback si configuré."
  );
}
