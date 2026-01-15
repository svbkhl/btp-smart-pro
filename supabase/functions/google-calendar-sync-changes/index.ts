// ============================================================================
// 🔄 GOOGLE CALENDAR SYNC CHANGES - Edge Function
// ============================================================================
// Description: Récupère les changements depuis Google Calendar via syncToken
//              Appelé par le webhook receiver après notification
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseGoogleCalendarDate, isGoogleEventAllDay } from "../_shared/google-calendar-helpers.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status?: string;
  colorId?: string;
  updated?: string;
  etag?: string;
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

    const { company_id, calendar_id } = await req.json();

    if (!company_id || !calendar_id) {
      return new Response(
        JSON.stringify({ error: "company_id and calendar_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer la connexion Google Calendar
    const { data: connection, error: connError } = await supabaseClient
      .from("google_calendar_connections")
      .select("*")
      .eq("company_id", company_id)
      .eq("calendar_id", calendar_id)
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

    const encodedCalendarId = encodeURIComponent(calendar_id);
    let syncUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events`;

    // Utiliser syncToken si disponible (sync incrémentale)
    if (connection.sync_token) {
      syncUrl += `?syncToken=${encodeURIComponent(connection.sync_token)}`;
    } else {
      // Première sync: récupérer depuis 30 jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      syncUrl += `?timeMin=${thirtyDaysAgo.toISOString()}&singleEvents=true&orderBy=updated`;
    }

    console.log(`🔄 [sync-changes] Récupération changements pour ${calendar_id}`);

    const response = await fetch(syncUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Si erreur 410, le syncToken est invalide
      if (response.status === 410) {
        console.warn(`⚠️ [sync-changes] SyncToken invalide, reset`);
        await supabaseClient
          .from("google_calendar_connections")
          .update({ sync_token: null })
          .eq("id", connection.id);
        
        // Réessayer sans syncToken
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const retryUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?timeMin=${thirtyDaysAgo.toISOString()}&singleEvents=true&orderBy=updated`;
        
        const retryResponse = await fetch(retryUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!retryResponse.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to sync after token reset", details: await retryResponse.text() }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const retryData = await retryResponse.json();
        const stats = await processEvents(retryData, connection, supabaseClient);
        
        // Sauvegarder le nouveau syncToken
        if (retryData.nextSyncToken) {
          await supabaseClient
            .from("google_calendar_connections")
            .update({ sync_token: retryData.nextSyncToken })
            .eq("id", connection.id);
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            ...stats,
            sync_token_reset: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to fetch changes", details: errorText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Traiter les événements
    const stats = await processEvents(data, connection, supabaseClient);
    
    // Sauvegarder le syncToken pour la prochaine fois
    if (data.nextSyncToken) {
      await supabaseClient
        .from("google_calendar_connections")
        .update({ sync_token: data.nextSyncToken })
        .eq("id", connection.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ...stats
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [sync-changes] Erreur:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fonction helper pour traiter les événements (identique à sync-incremental)
async function processEvents(
  data: { items?: GoogleEvent[], nextSyncToken?: string },
  connection: any,
  supabaseClient: any
): Promise<{ processed: number; created: number; updated: number; deleted: number }> {
  const events = data.items || [];
  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const googleEvent of events) {
    try {
      const calendarId = connection.calendar_id;
      
      // Si l'événement est annulé, soft delete
      if (googleEvent.status === "cancelled") {
        const { data: existingEvent } = await supabaseClient
          .from("events")
          .select("id")
          .eq("google_calendar_id", calendarId)
          .eq("google_event_id", googleEvent.id)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingEvent) {
          await supabaseClient
            .from("events")
            .update({ 
              deleted_at: new Date().toISOString(),
              last_update_source: "google",
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", existingEvent.id);
          deleted++;
        }
        continue;
      }

      // ⚠️ PRODUCTION READY: Convertir les dates avec helper
      const startDate = parseGoogleCalendarDate(googleEvent.start);
      const endDate = parseGoogleCalendarDate(googleEvent.end);
      const allDay = isGoogleEventAllDay(googleEvent.start);

      if (!startDate) {
        console.warn("⚠️ [sync-changes] Événement sans start_date:", googleEvent.id);
        continue;
      }

      const eventTitle = googleEvent.summary || "Sans titre";
      const googleUpdatedAt = googleEvent.updated ? new Date(googleEvent.updated).toISOString() : null;

      const eventData = {
        company_id: connection.company_id,
        user_id: connection.user_id || connection.owner_user_id,
        title: eventTitle,
        description: googleEvent.description || null,
        start_date: startDate,
        end_date: endDate || null,
        all_day: allDay,
        location: googleEvent.location || null,
        type: "meeting" as const,
        color: googleEvent.colorId ? `#${googleEvent.colorId}` : "#3b82f6",
        google_calendar_id: calendarId,
        google_event_id: googleEvent.id,
        google_updated_at: googleUpdatedAt,
        synced_with_google: true,
        google_sync_error: null,
        last_update_source: "google",
        last_synced_at: new Date().toISOString(),
        deleted_at: null,
      };

      // ⚠️ PRODUCTION READY: UPSERT robuste avec vérification google_updated_at
      // 1. Chercher l'événement existant
      const { data: existingEvent } = await supabaseClient
        .from("events")
        .select("id, google_updated_at, created_at")
        .eq("google_calendar_id", calendarId)
        .eq("google_event_id", googleEvent.id)
        .maybeSingle();

      // 2. Vérifier conflit de dates (ignorer update obsolète)
      if (existingEvent && googleUpdatedAt) {
        const existingUpdatedAt = existingEvent.google_updated_at 
          ? new Date(existingEvent.google_updated_at).getTime() 
          : 0;
        const newUpdatedAt = new Date(googleUpdatedAt).getTime();
        
        if (existingUpdatedAt >= newUpdatedAt) {
          console.log(`⏭️ [sync-changes] Update ignoré (obsolète): ${googleEvent.id}`);
          continue;
        }
      }

      // 3. UPSERT
      const { data: upsertedEvent, error: upsertError } = await supabaseClient
        .from("events")
        .upsert(eventData, {
          onConflict: "google_calendar_id,google_event_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (upsertError) {
        console.error(`❌ [sync-changes] Erreur upsert: ${upsertError.message}`);
        // Fallback: UPDATE manuel seulement si événement existe
        if (existingEvent) {
          const { error: updateError } = await supabaseClient
            .from("events")
            .update(eventData)
            .eq("id", existingEvent.id);
          
          if (updateError) {
            console.error(`❌ [sync-changes] UPDATE manuel échoué: ${updateError.message}`);
          } else {
            updated++;
          }
        } else {
          console.error(`❌ [sync-changes] Impossible d'insérer: UPSERT échoué et événement non trouvé`);
        }
        continue;
      }

      // 4. Compter
      if (upsertedEvent) {
        const wasInsert = existingEvent === null || 
          (new Date(upsertedEvent.created_at).getTime() > Date.now() - 2000);
        if (wasInsert) {
          created++;
        } else {
          updated++;
        }
      }

    } catch (error) {
      console.error(`❌ [sync-changes] Erreur traitement événement ${googleEvent.id}:`, error);
    }
  }

  return {
    processed: events.length,
    created,
    updated,
    deleted,
  };
}
