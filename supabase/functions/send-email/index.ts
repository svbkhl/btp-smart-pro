import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.2.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration Resend
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

// Log de la configuration au démarrage (une seule fois)
console.log("🔧 [send-email] Configuration Resend:", {
  RESEND_FROM_EMAIL_RAW: RESEND_FROM_EMAIL_RAW.substring(0, 50) + (RESEND_FROM_EMAIL_RAW.length > 50 ? "..." : ""),
  RESEND_FROM_EMAIL: RESEND_FROM_EMAIL,
  RESEND_FROM_NAME: RESEND_FROM_NAME,
  RESEND_API_KEY_CONFIGURED: !!RESEND_API_KEY,
  RESEND_API_KEY_TYPE: RESEND_API_KEY ? (RESEND_API_KEY.includes("test") ? "TEST" : "PRODUCTION") : "NON CONFIGURÉ",
});

interface EmailAttachment {
  filename: string;
  content: string; // Base64
  type: string;
}

interface SendEmailRequest {
  to: string;
  subject: string;
  html?: string;
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
    const supabaseClient = await import("https://esm.sh/@supabase/supabase-js@2").then(
      (mod) => mod.createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      )
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
      body = JSON.parse(rawBody);
      console.log("📥 Request received:", { 
        to: body.to, 
        subject: body.subject, 
        hasHtml: !!body.html,
        hasText: !!body.text,
        type: body.type,
      });
    } catch (parseError: any) {
      console.error("❌ Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", details: parseError?.message }),
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
      invoice_id,
      quote_id,
      replyTo,
      cc,
      bcc,
    } = body;

    // Vérification basique des champs
    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, and (html or text)" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get user settings for signature
    const { data: settings } = await supabaseClient
      .from("user_settings")
      .select("company_name, signature_name, email, phone, signature_data")
      .eq("user_id", user.id)
      .single();

    // Generate signature HTML and Text
    const signatureHtml = generateEmailSignature(settings);
    const signatureText = generateEmailSignatureText(settings);

    // ⚠️ NE PLUS générer automatiquement de bouton de signature
    // Les liens de signature sont maintenant gérés par les templates HTML
    // Pour éviter les doublons de boutons

    // Préparer le contenu HTML avec signature
    let htmlWithSignature: string | undefined;
    let textWithSignature: string | undefined;

    let htmlContent = html || "";

    if (htmlContent) {
      htmlWithSignature = `${htmlContent}\n\n${signatureHtml}`;
    } else if (text) {
      htmlWithSignature = `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${text.replace(/\n/g, '<br>')}</pre>\n\n${signatureHtml}`;
    }

    if (text) {
      textWithSignature = `${text}\n\n${signatureText}`;
    } else if (html) {
      const textFromHtml = html.replace(/<[^>]*>/g, "").replace(/\n\s*\n/g, "\n").trim();
      textWithSignature = `${textFromHtml}\n\n${signatureText}`;
    }

    // Vérifier que RESEND_FROM_EMAIL est configuré
    if (!RESEND_FROM_EMAIL || !RESEND_FROM_EMAIL.includes("@")) {
      console.error("❌ [send-email] RESEND_FROM_EMAIL non configuré ou invalide:", RESEND_FROM_EMAIL);
      return new Response(
        JSON.stringify({
          error: "RESEND_FROM_EMAIL not configured",
          details: "Configurez RESEND_FROM_EMAIL dans Supabase Dashboard > Settings > Edge Functions > Secrets avec une adresse email valide (ex: contact@btpsmartpro.com)",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Déterminer l'adresse "from" à utiliser
    // 1. Si l'utilisateur a configuré from_email dans user_email_settings, l'utiliser
    // 2. Sinon, utiliser RESEND_FROM_EMAIL comme fallback
    let fromEmail = RESEND_FROM_EMAIL;
    // Utiliser le nom depuis RESEND_FROM_EMAIL si configuré, sinon depuis settings, sinon depuis FROM_NAME
    const fromName = settings?.signature_name || RESEND_FROM_NAME;

    // Vérifier si l'utilisateur a une configuration email avec un domaine vérifié
    const { data: emailConfig } = await supabaseClient
      .from("user_email_settings")
      .select("from_email, smtp_user, provider")
      .eq("user_id", user.id)
      .single();

    if (emailConfig) {
      // Utiliser l'email de l'utilisateur s'il est configuré
      const userEmail = emailConfig.from_email || emailConfig.smtp_user;
      if (userEmail && userEmail.includes("@")) {
        const userDomain = userEmail.split("@")[1];
        const verifiedDomain = RESEND_FROM_EMAIL.split("@")[1];
        
        // Si le domaine de l'utilisateur est vérifié, l'utiliser
        // Sinon, utiliser RESEND_FROM_EMAIL mais mettre l'email utilisateur en Reply-To
        if (userDomain === verifiedDomain) {
          fromEmail = userEmail;
          console.log("✅ [send-email] Utilisation de l'email utilisateur (domaine vérifié):", fromEmail);
        } else {
          // Utiliser le fallback mais garder Reply-To
          console.log("⚠️ [send-email] Domaine utilisateur non vérifié, utilisation du fallback:", {
            userEmail,
            verifiedDomain,
            fallback: RESEND_FROM_EMAIL,
          });
        }
      }
    }

    // Valider et nettoyer l'email "from"
    if (!fromEmail || !fromEmail.includes("@")) {
      console.error("❌ [send-email] Email 'from' invalide:", fromEmail);
      return new Response(
        JSON.stringify({
          error: "Invalid from email",
          details: `L'adresse email 'from' n'est pas valide: ${fromEmail}. Configurez RESEND_FROM_EMAIL dans Supabase Secrets.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Nettoyer le nom pour éviter les caractères qui cassent le format
    const cleanFromName = fromName 
      ? fromName.replace(/[<>]/g, "").trim() // Enlever les < et > du nom
      : null;

    // Construire le champ "from" au format Resend
    // Format attendu: "Name <email@example.com>" ou "email@example.com"
    const from = cleanFromName 
      ? `${cleanFromName} <${fromEmail}>`
      : fromEmail;

    console.log("📧 [send-email] Configuration email finale:", {
      fromEmail,
      fromName,
      from,
      RESEND_FROM_EMAIL,
      RESEND_FROM_NAME,
      userEmailConfig: emailConfig ? {
        from_email: emailConfig.from_email,
        smtp_user: emailConfig.smtp_user,
        provider: emailConfig.provider,
      } : null,
    });

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "RESEND_API_KEY not configured",
          details: "Configurez RESEND_API_KEY (clé API de production) dans Supabase Dashboard > Settings > Edge Functions > Secrets"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Prepare email data for Resend API
    const emailData: any = {
      from,
      to: [to],
      subject,
    };

    if (htmlWithSignature) {
      emailData.html = htmlWithSignature;
    }
    if (textWithSignature) {
      emailData.text = textWithSignature;
    }

    // Add Reply-To si l'email utilisateur est différent de "from"
    if (emailConfig && emailConfig.from_email && emailConfig.from_email !== fromEmail) {
      emailData.reply_to = emailConfig.from_email;
      console.log("📧 [send-email] Reply-To configuré:", emailConfig.from_email);
    } else if (settings?.email && settings.email !== fromEmail) {
      emailData.reply_to = settings.email;
      console.log("📧 [send-email] Reply-To configuré (depuis settings):", settings.email);
    } else if (replyTo) {
      emailData.reply_to = replyTo;
    }
    
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

    console.log("📧 Sending email via Resend:", {
      from,
      to,
      subject,
      hasHtml: !!emailData.html,
      hasText: !!emailData.text,
      hasAttachments: attachments.length > 0,
    });

    // Envoi via Resend API
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
      
      // Message d'erreur plus clair
      if (errorMsg.includes("only send testing emails to your own email address") || 
          errorMsg.includes("testing emails to your own")) {
        errorMsg = `⚠️ Mode test Resend : Vous ne pouvez envoyer qu'à votre propre adresse email (${user.email || "votre email"}). ` +
          `Pour envoyer à d'autres destinataires : ` +
          `1) Vérifiez un domaine sur https://resend.com/domains, ` +
          `2) Utilisez une clé API de production (pas de test), ` +
          `3) Ou configurez RESEND_FROM_EMAIL avec un domaine vérifié.`;
      } else if (errorMsg.includes("domain is not verified") || errorMsg.includes("not verified")) {
        errorMsg = `Le domaine de l'adresse email "${RESEND_FROM_EMAIL}" n'est pas vérifié sur Resend. ` +
          `Options : 1) Vérifiez votre domaine sur https://resend.com/domains, ` +
          `2) Utilisez onboarding@resend.dev (déjà configuré), ` +
          `3) Configurez RESEND_FROM_EMAIL avec un domaine vérifié.`;
      }
      
      console.error("❌ Resend API error:", errorMsg, resendData);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg,
          details: resendData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: resendResponse.status || 500,
        }
      );
    }

    const emailId = resendData.id;
    console.log("✅ Email sent successfully via Resend:", emailId);

    // Log email message in database
    try {
      // Déterminer document_id et document_type
      const document_id = quote_id || invoice_id || null;
      const document_type = quote_id ? "quote" : invoice_id ? "invoice" : null;

      // Déterminer le type d'email basé sur le contexte
      // Si un lien de signature a été ajouté, c'est une demande de signature
      const hasSignatureLink = !!(signatureUrl && quote_id);
      let emailType: string;
      
      if (hasSignatureLink) {
        emailType = "signature_request";
      } else if (quote_id) {
        emailType = "quote_sent";
      } else if (invoice_id) {
        emailType = "signature_request"; // Les factures sont généralement pour signature
      } else if (type && ["quote_sent", "signature_request", "reminder", "generic"].includes(type)) {
        emailType = type;
      } else {
        emailType = "generic"; // Par défaut si aucun contexte
      }

      const insertData: any = {
        user_id: user.id,
        to_email: to, // Utiliser to_email au lieu de recipient_email
        subject,
        body: textWithSignature || text || subject, // Colonne body (NOT NULL)
        body_html: htmlWithSignature || null,
        body_text: textWithSignature || text || null,
        email_type: emailType, // Toujours défini, jamais null
        status: "sent",
        external_id: emailId,
        sent_at: new Date().toISOString(),
        invoice_id: invoice_id || null,
        quote_id: quote_id || null,
      };

      // Ajouter document_id si disponible (pour compatibilité avec la colonne)
      if (document_id) {
        insertData.document_id = document_id;
      }
      if (document_type) {
        insertData.document_type = document_type;
      }

      const { error: insertError } = await supabaseClient
        .from("email_messages")
        .insert(insertData);

      if (insertError) {
        // Si document_id n'existe pas, essayer sans
        if (insertError.message?.includes("document_id")) {
          console.warn("⚠️ Colonne document_id manquante, insertion sans cette colonne");
          const { document_id: _, document_type: __, ...dataWithoutDocId } = insertData;
          // email_type est déjà présent dans insertData, donc il sera conservé dans dataWithoutDocId
          await supabaseClient.from("email_messages").insert(dataWithoutDocId);
        } else {
          throw insertError;
        }
      } else {
        console.log("✅ Email message enregistré dans email_messages");
      }
    } catch (error) {
      console.warn("⚠️ Could not log email message:", error);
      // Ne pas bloquer l'envoi si l'enregistrement échoue
    }

    // Update document status if invoice_id or quote_id provided
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
    
    return new Response(
      JSON.stringify({
        error: errorMessage || "Failed to send email",
        details: error?.stack || {},
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
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
