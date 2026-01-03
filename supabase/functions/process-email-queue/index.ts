import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@edifice-opus-one.com";
const FROM_NAME = Deno.env.get("FROM_NAME") || "BTP Smart Pro";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier l'authentification (Cron Secret)
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer les emails en attente (max 20 par batch)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("retry_count", 3) // Maximum 3 tentatives
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending emails",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`📧 Processing ${pendingEmails.length} pending emails...`);

    let successCount = 0;
    let failureCount = 0;

    // Traiter chaque email
    for (const email of pendingEmails) {
      try {
        if (!RESEND_API_KEY) {
          throw new Error("RESEND_API_KEY not configured");
        }

        // Préparer les données pour Resend
        const emailData: any = {
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [email.to_email],
          subject: email.subject,
          html: email.html_content,
        };

        if (email.text_content) {
          emailData.text = email.text_content;
        }

        // Envoyer via Resend
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailData),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
          throw new Error(resendData.message || "Failed to send email");
        }

        // Marquer comme envoyé
        await supabase
          .from("email_queue")
          .update({
            status: "sent",
            external_id: resendData.id,
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", email.id);

        successCount++;
        console.log(`✅ Email sent: ${email.id}`);
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed to send email ${email.id}:`, error);

        // Incrémenter retry_count et marquer comme failed si > 3
        const newRetryCount = (email.retry_count || 0) + 1;
        const newStatus = newRetryCount >= 3 ? "failed" : "pending";

        await supabase
          .from("email_queue")
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            error_message: error.message || "Unknown error",
          })
          .eq("id", email.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingEmails.length} emails`,
        sent: successCount,
        failed: failureCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error in process-email-queue:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process email queue",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});



















