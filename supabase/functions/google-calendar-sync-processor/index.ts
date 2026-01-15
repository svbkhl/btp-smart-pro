// ============================================================================
// 🔄 GOOGLE CALENDAR SYNC PROCESSOR - Edge Function
// ============================================================================
// Description: Traite la queue de synchronisation (app → Google)
//              Appelé par un cron job ou manuellement
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createGoogleEventPayload } from "../_shared/google-calendar-helpers.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

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

    // Vérifier l'authentification (optionnel pour cron job)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { error: authError } = await supabaseClient.auth.getUser(token);
      if (authError) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Récupérer les entrées en attente (limite de 50 par batch)
    const { data: queueItems, error: queueError } = await supabaseClient
      .from("google_calendar_sync_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (queueError) {
      console.error("❌ [sync-processor] Erreur récupération queue:", queueError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch queue", details: queueError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No items to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔄 [sync-processor] Traitement de ${queueItems.length} élément(s)`);

    let processed = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        // Marquer comme en traitement
        await supabaseClient
          .from("google_calendar_sync_queue")
          .update({ status: "processing" })
          .eq("id", item.id);

        // Récupérer la connexion Google Calendar
        const { data: connection, error: connError } = await supabaseClient
          .from("google_calendar_connections")
          .select("*")
          .eq("company_id", item.company_id)
          .eq("enabled", true)
          .single();

        if (connError || !connection) {
          throw new Error("No active Google Calendar connection found");
        }

        // Récupérer l'événement
        const { data: event, error: eventError } = await supabaseClient
          .from("events")
          .select("*")
          .eq("id", item.event_id)
          .single();

        if (eventError || !event) {
          // Événement supprimé, marquer comme complété
          await supabaseClient
            .from("google_calendar_sync_queue")
            .update({ 
              status: "completed",
              processed_at: new Date().toISOString()
            })
            .eq("id", item.id);
          continue;
        }

        // ⚠️ ANTI-LOOP: Ignorer si l'événement vient de Google
        if (event.last_update_source === "google") {
          console.log(`⏭️ [sync-processor] Événement ignoré (vient de Google): ${event.id}`);
          await supabaseClient
            .from("google_calendar_sync_queue")
            .update({ 
              status: "completed",
              processed_at: new Date().toISOString()
            })
            .eq("id", item.id);
          continue;
        }

        // ⚠️ ANTI-LOOP: Ignorer si déjà synchronisé récemment
        if (event.last_synced_at && event.updated_at) {
          const lastSynced = new Date(event.last_synced_at).getTime();
          const lastUpdated = new Date(event.updated_at).getTime();
          if (lastUpdated <= lastSynced) {
            console.log(`⏭️ [sync-processor] Événement déjà synchronisé: ${event.id}`);
            await supabaseClient
              .from("google_calendar_sync_queue")
              .update({ 
                status: "completed",
                processed_at: new Date().toISOString()
              })
              .eq("id", item.id);
            continue;
          }
        }

        // Vérifier et rafraîchir le token si nécessaire
        let accessToken = connection.access_token;
        if (new Date(connection.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
          if (!connection.refresh_token) {
            throw new Error("Token expired and no refresh token available");
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
            throw new Error("Failed to refresh token");
          }

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

        const calendarId = encodeURIComponent(connection.calendar_id || "primary");
        const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

        // Traiter selon l'action
        if (item.action === "create") {
          // ⚠️ PRODUCTION READY: Utiliser helper pour formatage dates correct
          const googleEventPayload = createGoogleEventPayload(
            event.title,
            event.description,
            event.location,
            event.start_date,
            event.end_date || null,
            event.all_day || false,
            "Europe/Paris"
          );
          
          const googleEvent: GoogleEvent = {
            ...googleEventPayload,
            colorId: event.color ? event.color.replace("#", "") : undefined,
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
            const errorText = await response.text();
            throw new Error(`Google API error: ${errorText}`);
          }

          const googleEventResponse = await response.json();

          // Mettre à jour l'événement avec google_event_id ET google_calendar_id
          await supabaseClient
            .from("events")
            .update({
              google_calendar_id: connection.calendar_id, // ⚠️ OBLIGATOIRE pour la clé composite
              google_event_id: googleEventResponse.id,
              synced_with_google: true,
              google_sync_error: null,
              last_update_source: "app", // Modification venant de l'app
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", item.event_id);

        } else if (item.action === "update") {
          if (!event.google_event_id) {
            // Pas encore synchronisé, créer
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
              const errorText = await response.text();
              throw new Error(`Google API error: ${errorText}`);
            }

            const googleEventResponse = await response.json();

            await supabaseClient
              .from("events")
              .update({
                google_calendar_id: connection.calendar_id, // ⚠️ OBLIGATOIRE pour la clé composite
                google_event_id: googleEventResponse.id,
                synced_with_google: true,
                google_sync_error: null,
                last_update_source: "app", // Modification venant de l'app
                last_synced_at: new Date().toISOString(),
              })
              .eq("id", item.event_id);
          } else {
            // Mettre à jour l'événement existant
            const googleEventPayload = createGoogleEventPayload(
              event.title,
              event.description,
              event.location,
              event.start_date,
              event.end_date || null,
              event.all_day || false,
              "Europe/Paris"
            );
            
            const googleEvent: GoogleEvent = {
              ...googleEventPayload,
              colorId: event.color ? event.color.replace("#", "") : undefined,
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
              const errorText = await response.text();
              throw new Error(`Google API error: ${errorText}`);
            }

            await supabaseClient
              .from("events")
              .update({
                synced_with_google: true,
                google_sync_error: null,
                last_update_source: "app", // Modification venant de l'app
                last_synced_at: new Date().toISOString(),
              })
              .eq("id", item.event_id);
          }

        } else if (item.action === "delete") {
          // Récupérer google_event_id depuis l'événement (ou depuis l'ancien état)
          const { data: deletedEvent } = await supabaseClient
            .from("events")
            .select("google_event_id")
            .eq("id", item.event_id)
            .single();

          // Si l'événement existe encore mais n'a pas de google_event_id, skip
          if (!deletedEvent?.google_event_id) {
            await supabaseClient
              .from("google_calendar_sync_queue")
              .update({ 
                status: "completed",
                processed_at: new Date().toISOString()
              })
              .eq("id", item.id);
            continue;
          }

          const response = await fetch(`${baseUrl}/${deletedEvent.google_event_id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          // 404 est OK (déjà supprimé)
          if (!response.ok && response.status !== 404) {
            const errorText = await response.text();
            throw new Error(`Google API error: ${errorText}`);
          }
        }

        // Marquer comme complété
        await supabaseClient
          .from("google_calendar_sync_queue")
          .update({ 
            status: "completed",
            processed_at: new Date().toISOString()
          })
          .eq("id", item.id);

        processed++;

      } catch (error) {
        console.error(`❌ [sync-processor] Erreur traitement item ${item.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Incrémenter retry_count
        const newRetryCount = item.retry_count + 1;
        
        if (newRetryCount >= item.max_retries) {
          // Marquer comme failed
          await supabaseClient
            .from("google_calendar_sync_queue")
            .update({ 
              status: "failed",
              error_message: errorMessage,
              processed_at: new Date().toISOString()
            })
            .eq("id", item.id);
          
          // Mettre à jour l'événement avec l'erreur
          await supabaseClient
            .from("events")
            .update({ google_sync_error: errorMessage })
            .eq("id", item.event_id);
          
          failed++;
        } else {
          // Réessayer plus tard
          await supabaseClient
            .from("google_calendar_sync_queue")
            .update({ 
              status: "pending",
              retry_count: newRetryCount,
              error_message: errorMessage
            })
            .eq("id", item.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed,
        failed,
        total: queueItems.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [sync-processor] Erreur globale:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
