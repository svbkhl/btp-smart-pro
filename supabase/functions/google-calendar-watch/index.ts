// ============================================================================
// 👁️ GOOGLE CALENDAR WATCH - Edge Function
// ============================================================================
// Description: Initialise les webhooks Google Calendar Watch API
//              pour recevoir les notifications de changements
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const WEBHOOK_BASE_URL = Deno.env.get("WEBHOOK_BASE_URL") || "";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier les permissions (owner ou admin)
    const { data: companyUser, error: roleError } = await supabaseClient
      .from("company_users")
      .select("company_id, roles(slug)")
      .eq("user_id", user.id)
      .eq("company_id", company_id)
      .single();

    if (roleError || !companyUser) {
      return new Response(
        JSON.stringify({ error: "User not associated with company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userRoleSlug = companyUser.roles?.slug;
    if (userRoleSlug !== "owner" && userRoleSlug !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only owners and admins can manage webhooks" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer la connexion Google Calendar
    const { data: connection, error: connError } = await supabaseClient
      .from("google_calendar_connections")
      .select("*")
      .eq("company_id", company_id)
      .eq("enabled", true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active Google Calendar connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier et rafraîchir le token si nécessaire
    let accessToken = connection.access_token;
    if (new Date(connection.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({ error: "Token expired and no refresh token available" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: connection.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to refresh token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;

      await supabaseClient
        .from("google_calendar_connections")
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq("id", connection.id);
    }

    // Vérifier si un webhook existe déjà
    const { data: existingWebhook } = await supabaseClient
      .from("google_calendar_webhooks")
      .select("*")
      .eq("company_id", company_id)
      .eq("calendar_id", connection.calendar_id)
      .eq("enabled", true)
      .maybeSingle();

    // Si un webhook existe et n'est pas expiré, le retourner
    if (existingWebhook) {
      const expirationTime = new Date(existingWebhook.expiration_timestamp);
      if (expirationTime > new Date()) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            webhook: {
              id: existingWebhook.id,
              channel_id: existingWebhook.channel_id,
              expiration: new Date(existingWebhook.expiration_timestamp).toISOString(),
            },
            message: "Webhook already exists and is active"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Désactiver l'ancien webhook expiré
        await supabaseClient
          .from("google_calendar_webhooks")
          .update({ enabled: false })
          .eq("id", existingWebhook.id);
      }
    }

    // Générer un channel_id unique
    const channelId = `webhook-${company_id}-${Date.now()}`;
    const webhookUrl = `${WEBHOOK_BASE_URL}/functions/v1/google-calendar-webhook`;

    // Durée du webhook: 7 jours (maximum Google)
    const expirationTime = Date.now() + (7 * 24 * 60 * 60 * 1000);

    // Appeler Google Calendar Watch API
    const watchResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events/watch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          expiration: expirationTime,
        }),
      }
    );

    if (!watchResponse.ok) {
      const errorText = await watchResponse.text();
      console.error("❌ [watch] Erreur Google Watch API:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create watch", details: errorText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const watchData = await watchResponse.json();

    // Enregistrer le webhook dans la base
    const { data: webhook, error: webhookInsertError } = await supabaseClient
      .from("google_calendar_webhooks")
      .upsert({
        company_id: company_id,
        calendar_id: connection.calendar_id,
        channel_id: channelId,
        resource_id: watchData.resourceId,
        expiration_timestamp: expirationTime,
        enabled: true,
      }, {
        onConflict: "company_id,calendar_id"
      })
      .select()
      .single();

    if (webhookInsertError) {
      console.error("❌ [watch] Erreur sauvegarde webhook:", webhookInsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save webhook", details: webhookInsertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [watch] Webhook créé:", {
      channelId,
      resourceId: watchData.resourceId,
      expiration: new Date(expirationTime).toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        webhook: {
          id: webhook.id,
          channel_id: webhook.channel_id,
          resource_id: webhook.resource_id,
          expiration: new Date(webhook.expiration_timestamp).toISOString(),
        },
        message: "Webhook created successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [watch] Erreur:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
