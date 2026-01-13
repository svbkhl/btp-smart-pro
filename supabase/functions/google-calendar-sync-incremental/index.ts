// ============================================================================
// 🔄 GOOGLE CALENDAR SYNC INCREMENTAL - Edge Function
// ============================================================================
// Description: Synchronise les changements depuis Google Calendar vers l'app
//              Utilise syncToken pour la synchronisation incrémentale
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { company_id } = await req.json().catch(() => ({}));

    // Si company_id fourni, synchroniser seulement cette company
    // Sinon, synchroniser toutes les companies avec connexions actives
    let connectionsQuery = supabaseClient
      .from("google_calendar_connections")
      .select("*")
      .eq("enabled", true)
      .gt("expires_at", new Date().toISOString());

    if (company_id) {
      connectionsQuery = connectionsQuery.eq("company_id", company_id);
    }

    const { data: connections, error: connError } = await connectionsQuery;

    if (connError || !connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No active connections" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔄 [sync-incremental] Synchronisation de ${connections.length} connexion(s)`);

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;
    let totalErrors = 0;

    for (const connection of connections) {
      try {
        // Vérifier et rafraîchir le token si nécessaire
        let accessToken = connection.access_token;
        if (new Date(connection.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
          if (!connection.refresh_token) {
            console.warn(`⚠️ [sync-incremental] Token expiré sans refresh_token pour ${connection.id}`);
            continue;
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
            console.error(`❌ [sync-incremental] Erreur refresh token pour ${connection.id}`);
            continue;
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

        const calendarId = encodeURIComponent(connection.calendar_id || "primary");
        let syncUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

        // Utiliser syncToken si disponible (sync incrémentale)
        if (connection.sync_token) {
          syncUrl += `?syncToken=${encodeURIComponent(connection.sync_token)}`;
        } else {
          // Première sync: récupérer tous les événements depuis 30 jours
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          syncUrl += `?timeMin=${thirtyDaysAgo.toISOString()}&singleEvents=true&orderBy=updated`;
        }

        const response = await fetch(syncUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Si erreur 410, le syncToken est invalide, refaire une sync complète
          if (response.status === 410) {
            console.warn(`⚠️ [sync-incremental] SyncToken invalide pour ${connection.id}, reset`);
            await supabaseClient
              .from("google_calendar_connections")
              .update({ sync_token: null })
              .eq("id", connection.id);
            
            // Réessayer sans syncToken
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const retryUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${thirtyDaysAgo.toISOString()}&singleEvents=true&orderBy=updated`;
            
            const retryResponse = await fetch(retryUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (!retryResponse.ok) {
              console.error(`❌ [sync-incremental] Erreur retry pour ${connection.id}:`, await retryResponse.text());
              totalErrors++;
              continue;
            }

            const retryData = await retryResponse.json();
            await processEvents(retryData, connection, supabaseClient);
            
            // Sauvegarder le nouveau syncToken
            if (retryData.nextSyncToken) {
              await supabaseClient
                .from("google_calendar_connections")
                .update({ sync_token: retryData.nextSyncToken })
                .eq("id", connection.id);
            }
            
            continue;
          }

          console.error(`❌ [sync-incremental] Erreur API pour ${connection.id}:`, errorText);
          totalErrors++;
          continue;
        }

        const data = await response.json();
        
        // Traiter les événements
        const stats = await processEvents(data, connection, supabaseClient);
        
        totalProcessed += stats.processed;
        totalCreated += stats.created;
        totalUpdated += stats.updated;
        totalDeleted += stats.deleted;

        // Sauvegarder le syncToken pour la prochaine fois
        if (data.nextSyncToken) {
          await supabaseClient
            .from("google_calendar_connections")
            .update({ sync_token: data.nextSyncToken })
            .eq("id", connection.id);
        }

      } catch (error) {
        console.error(`❌ [sync-incremental] Erreur traitement connexion ${connection.id}:`, error);
        totalErrors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: totalProcessed,
        created: totalCreated,
        updated: totalUpdated,
        deleted: totalDeleted,
        errors: totalErrors,
        connections: connections.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [sync-incremental] Erreur globale:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fonction helper pour traiter les événements
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
      // ⚠️ ANTI-LOOP: Marquer updated_source = 'google' pour éviter de renvoyer à Google
      
      // Si l'événement est annulé, le supprimer
      if (googleEvent.status === "cancelled") {
        const { data: existingEvent } = await supabaseClient
          .from("events")
          .select("id")
          .eq("google_event_id", googleEvent.id)
          .eq("company_id", connection.company_id)
          .single();

        if (existingEvent) {
          await supabaseClient
            .from("events")
            .delete()
            .eq("id", existingEvent.id);
          deleted++;
        }
        continue;
      }

      // Convertir les dates Google en format app
      const startDate = googleEvent.start?.dateTime || googleEvent.start?.date;
      const endDate = googleEvent.end?.dateTime || googleEvent.end?.date;
      const allDay = !!googleEvent.start?.date && !googleEvent.start?.dateTime;

      if (!startDate) {
        console.warn("⚠️ [sync-incremental] Événement sans start_date:", googleEvent.id);
        continue;
      }

      const eventTitle = googleEvent.summary || "Sans titre";
      
      // ⚠️ STRATÉGIE DE MATCHING AMÉLIORÉE :
      // 1. Chercher d'abord par google_event_id (le plus fiable)
      // 2. Si pas trouvé, chercher par title + start_date (pour éviter les doublons)
      // 3. Seulement créer si vraiment aucun match
      
      let existingEvent = null;
      
      // 1. Chercher par google_event_id
      const { data: eventByGoogleId } = await supabaseClient
        .from("events")
        .select("*")
        .eq("google_event_id", googleEvent.id)
        .eq("company_id", connection.company_id)
        .maybeSingle();
      
      if (eventByGoogleId) {
        existingEvent = eventByGoogleId;
        console.log(`✅ [sync-incremental] Événement trouvé par google_event_id: ${googleEvent.id}`);
      } else {
        // 2. Chercher par title + start_date (pour éviter les doublons si google_event_id manquant)
        // Normaliser la date pour la comparaison (enlever les heures si all_day)
        const startDateForMatch = allDay 
          ? startDate.split("T")[0] 
          : new Date(startDate).toISOString();
        
        const { data: eventByTitleAndDate } = await supabaseClient
          .from("events")
          .select("*")
          .eq("company_id", connection.company_id)
          .eq("title", eventTitle)
          .gte("start_date", new Date(new Date(startDateForMatch).getTime() - 5 * 60 * 1000).toISOString()) // -5 min
          .lte("start_date", new Date(new Date(startDateForMatch).getTime() + 5 * 60 * 1000).toISOString()) // +5 min
          .is("google_event_id", null) // Seulement ceux qui n'ont pas encore de google_event_id
          .maybeSingle();
        
        if (eventByTitleAndDate) {
          existingEvent = eventByTitleAndDate;
          console.log(`✅ [sync-incremental] Événement trouvé par title+date: ${eventTitle} - ${startDateForMatch}`);
        }
      }

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
        google_event_id: googleEvent.id, // ⚠️ Toujours mettre à jour google_event_id
        synced_with_google: true,
        google_sync_error: null,
        updated_source: "google", // ⚠️ IMPORTANT: Évite la boucle
        last_synced_at: new Date().toISOString(),
      };

      if (existingEvent) {
        // Mettre à jour l'événement existant (NE PAS CRÉER DE NOUVEAU)
        await supabaseClient
          .from("events")
          .update(eventData)
          .eq("id", existingEvent.id);
        updated++;
        console.log(`✅ [sync-incremental] Événement mis à jour: ${existingEvent.id} (titre: ${eventTitle})`);
      } else {
        // Créer un nouvel événement seulement si vraiment aucun match
        await supabaseClient
          .from("events")
          .insert(eventData);
        created++;
        console.log(`✅ [sync-incremental] Nouvel événement créé: ${eventTitle} (google_event_id: ${googleEvent.id})`);
      }

    } catch (error) {
      console.error(`❌ [sync-incremental] Erreur traitement événement ${googleEvent.id}:`, error);
    }
  }

  return {
    processed: events.length,
    created,
    updated,
    deleted,
  };
}
