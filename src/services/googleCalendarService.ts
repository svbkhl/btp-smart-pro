// ============================================================================
// 🔗 SERVICE GOOGLE CALENDAR - NIVEAU ENTREPRISE
// ============================================================================
// Description: Service pour synchroniser événements et plannings avec Google Calendar
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface GoogleCalendarConnection {
  id: string;
  company_id: string;
  owner_user_id: string;
  google_email: string;
  calendar_id: string;
  calendar_name: string;
  calendar_type?: "planning" | "agenda" | "events";
  sync_direction: "app_to_google" | "bidirectional" | "google_to_app";
  sync_planning_enabled: boolean;
  enabled: boolean;
  expires_at: string;
  last_sync_at: string | null;
}

export interface SyncEventParams {
  action: "create" | "update" | "delete";
  eventId?: string;
  assignmentId?: string;
  eventType: "event" | "planning";
  companyId: string;
}

export type GoogleCalendarType = "planning" | "agenda" | "events";

/**
 * Récupère la connexion Google Calendar active de l'entreprise pour un type donné
 * (planning → Planning, events → Événements). Compatible avec ou sans colonne calendar_type.
 */
export async function getCompanyGoogleCalendarConnection(
  companyId: string,
  calendarType?: GoogleCalendarType
): Promise<GoogleCalendarConnection | null> {
  const { data: list, error } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("company_id", companyId)
    .eq("enabled", true);

  if (error) {
    console.error("❌ [getCompanyGoogleCalendarConnection] Erreur:", error);
    throw error;
  }

  const rows = (list || []) as GoogleCalendarConnection[];
  if (rows.length === 0) return null;

  if (calendarType) {
    const byType = rows.find((c) => c.calendar_type === calendarType);
    if (byType) return byType;
  }
  return rows[0];
}

/**
 * Synchronise un événement ou un planning avec Google Calendar
 */
export async function syncWithGoogleCalendar(params: SyncEventParams): Promise<void> {
  const { action, eventId, assignmentId, eventType, companyId } = params;

  // Récupérer la connexion du bon type de calendrier (planning ou events)
  const calendarType: GoogleCalendarType = eventType === "planning" ? "planning" : "events";
  const connection = await getCompanyGoogleCalendarConnection(companyId, calendarType);
  if (!connection) {
    console.warn("⚠️ [syncWithGoogleCalendar] Aucune connexion Google Calendar active");
    return;
  }

  // Vérifier si la sync planning est activée pour les plannings
  if (eventType === "planning" && !connection.sync_planning_enabled) {
    console.log("ℹ️ [syncWithGoogleCalendar] Sync planning désactivée");
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke("google-calendar-sync-entreprise", {
      body: {
        action,
        event_id: eventId,
        assignment_id: assignmentId,
        company_id: companyId,
        event_type: eventType,
      },
    });

    if (error) {
      console.error(`❌ [syncWithGoogleCalendar] Erreur ${action}:`, error);
      throw error;
    }

    console.log(`✅ [syncWithGoogleCalendar] ${action} réussi pour ${eventType}`);
    return data;
  } catch (error) {
    console.error(`❌ [syncWithGoogleCalendar] Erreur lors de la synchronisation:`, error);
    // Ne pas bloquer l'opération si la sync échoue
    throw error;
  }
}

/**
 * Synchronise tous les plannings d'une entreprise vers Google Calendar
 */
export async function syncAllPlanningsToGoogle(companyId: string): Promise<void> {
  const connection = await getCompanyGoogleCalendarConnection(companyId, "planning");
  if (!connection || !connection.sync_planning_enabled) {
    console.warn("⚠️ [syncAllPlanningsToGoogle] Connexion non disponible ou sync désactivée");
    return;
  }

  // Récupérer tous les plannings non synchronisés
  const { data: assignments, error } = await supabase
    .from("employee_assignments")
    .select("id, company_id")
    .eq("company_id", companyId)
    .eq("synced_with_google", false)
    .is("google_sync_error", null);

  if (error) {
    console.error("❌ [syncAllPlanningsToGoogle] Erreur récupération plannings:", error);
    throw error;
  }

  if (!assignments || assignments.length === 0) {
    console.log("ℹ️ [syncAllPlanningsToGoogle] Aucun planning à synchroniser");
    return;
  }

  console.log(`🔄 [syncAllPlanningsToGoogle] Synchronisation de ${assignments.length} plannings...`);

  // Synchroniser chaque planning
  for (const assignment of assignments) {
    try {
      await syncWithGoogleCalendar({
        action: "create",
        assignmentId: assignment.id,
        eventType: "planning",
        companyId,
      });
    } catch (error) {
      console.error(`❌ [syncAllPlanningsToGoogle] Erreur sync planning ${assignment.id}:`, error);
      // Continuer avec les autres plannings
    }
  }

  console.log(`✅ [syncAllPlanningsToGoogle] Synchronisation terminée`);
}

/**
 * Synchronise tous les événements d'une entreprise vers Google Calendar
 */
export async function syncAllEventsToGoogle(companyId: string): Promise<void> {
  const connection = await getCompanyGoogleCalendarConnection(companyId);
  if (!connection) {
    console.warn("⚠️ [syncAllEventsToGoogle] Aucune connexion Google Calendar active");
    return;
  }

  // Récupérer tous les événements non synchronisés
  const { data: events, error } = await supabase
    .from("events")
    .select("id, company_id")
    .eq("company_id", companyId)
    .eq("synced_with_google", false)
    .is("google_sync_error", null);

  if (error) {
    console.error("❌ [syncAllEventsToGoogle] Erreur récupération événements:", error);
    throw error;
  }

  if (!events || events.length === 0) {
    console.log("ℹ️ [syncAllEventsToGoogle] Aucun événement à synchroniser");
    return;
  }

  console.log(`🔄 [syncAllEventsToGoogle] Synchronisation de ${events.length} événements...`);

  // Synchroniser chaque événement
  for (const event of events) {
    try {
      await syncWithGoogleCalendar({
        action: "create",
        eventId: event.id,
        eventType: "event",
        companyId,
      });
    } catch (error) {
      console.error(`❌ [syncAllEventsToGoogle] Erreur sync événement ${event.id}:`, error);
      // Continuer avec les autres événements
    }
  }

  console.log(`✅ [syncAllEventsToGoogle] Synchronisation terminée`);
}
