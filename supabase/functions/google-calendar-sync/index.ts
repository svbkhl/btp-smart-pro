// ============================================================================
// 🔄 GOOGLE CALENDAR SYNC - Edge Function
// ============================================================================
// Description: Synchronise les événements avec Google Calendar
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GoogleEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  colorId?: string;
}

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

    const { action, event_id, company_id } = await req.json();

    if (!action || !event_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "action, event_id, and company_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer la connexion Google Calendar active
    const { data: connection, error: connError } = await supabaseClient
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("company_id", company_id)
      .eq("enabled", true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active Google Calendar connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier si le token est expiré et le rafraîchir si nécessaire
    let accessToken = connection.access_token;
    if (new Date(connection.expires_at) <= new Date()) {
      // Rafraîchir le token
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
          refresh_token: connection.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        accessToken = newTokens.access_token;
        
        // Mettre à jour la connexion
        await supabaseClient
          .from("google_calendar_connections")
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          })
          .eq("id", connection.id);
      }
    }

    // Récupérer l'événement depuis la base de données
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("*")
      .eq("id", event_id)
      .eq("user_id", user.id)
      .eq("company_id", company_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const calendarId = encodeURIComponent(connection.calendar_id || "primary");
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    // ========================================================================
    // ACTION: create - Créer un événement dans Google Calendar
    // ========================================================================
    if (action === "create") {
      const googleEvent: GoogleEvent = {
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start: event.all_day
          ? { date: event.start_date.split("T")[0] }
          : { dateTime: event.start_date, timeZone: "Europe/Paris" },
        end: event.end_date
          ? event.all_day
            ? { date: event.end_date.split("T")[0] }
            : { dateTime: event.end_date, timeZone: "Europe/Paris" }
          : event.all_day
          ? { date: event.start_date.split("T")[0] }
          : { dateTime: event.start_date, timeZone: "Europe/Paris" },
      };

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Google Calendar API error:", error);
        
        // Mettre à jour l'événement avec l'erreur
        await supabaseClient
          .from("events")
          .update({ google_sync_error: error })
          .eq("id", event_id);

        return new Response(
          JSON.stringify({ error: "Failed to create event in Google Calendar", details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const googleEventResponse = await response.json();

      // Mettre à jour l'événement avec google_event_id
      await supabaseClient
        .from("events")
        .update({
          google_event_id: googleEventResponse.id,
          synced_with_google: true,
          google_sync_error: null,
        })
        .eq("id", event_id);

      // Mettre à jour last_sync_at
      await supabaseClient.rpc("update_google_calendar_sync_time", {
        connection_uuid: connection.id,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          google_event_id: googleEventResponse.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ACTION: update - Mettre à jour un événement dans Google Calendar
    // ========================================================================
    if (action === "update") {
      if (!event.google_event_id) {
        return new Response(
          JSON.stringify({ error: "Event not synced with Google Calendar" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const googleEvent: GoogleEvent = {
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start: event.all_day
          ? { date: event.start_date.split("T")[0] }
          : { dateTime: event.start_date, timeZone: "Europe/Paris" },
        end: event.end_date
          ? event.all_day
            ? { date: event.end_date.split("T")[0] }
            : { dateTime: event.end_date, timeZone: "Europe/Paris" }
          : event.all_day
          ? { date: event.start_date.split("T")[0] }
          : { dateTime: event.start_date, timeZone: "Europe/Paris" },
      };

      const response = await fetch(`${baseUrl}/${event.google_event_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Google Calendar API error:", error);
        
        await supabaseClient
          .from("events")
          .update({ google_sync_error: error })
          .eq("id", event_id);

        return new Response(
          JSON.stringify({ error: "Failed to update event in Google Calendar", details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseClient
        .from("events")
        .update({
          synced_with_google: true,
          google_sync_error: null,
        })
        .eq("id", event_id);

      await supabaseClient.rpc("update_google_calendar_sync_time", {
        connection_uuid: connection.id,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ACTION: delete - Supprimer un événement dans Google Calendar
    // ========================================================================
    if (action === "delete") {
      if (!event.google_event_id) {
        return new Response(
          JSON.stringify({ success: true, message: "Event not synced, nothing to delete" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(`${baseUrl}/${event.google_event_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        console.error("Google Calendar API error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete event in Google Calendar", details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseClient
        .from("events")
        .update({
          google_event_id: null,
          synced_with_google: false,
          google_sync_error: null,
        })
        .eq("id", event_id);

      await supabaseClient.rpc("update_google_calendar_sync_time", {
        connection_uuid: connection.id,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

