import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleCalendarConnection, useSyncEventWithGoogle } from "@/hooks/useGoogleCalendar";

// ============================================================================
// TYPES
// ============================================================================

export interface Event {
  id: string;
  user_id: string;
  company_id: string;
  project_id?: string | null;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  all_day: boolean;
  location?: string | null;
  type: "meeting" | "task" | "deadline" | "reminder" | "other";
  color: string;
  reminder_minutes?: number | null;
  reminder_recurring?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  location?: string;
  type?: "meeting" | "task" | "deadline" | "reminder" | "other";
  color?: string;
  project_id?: string;
  reminder_minutes?: number;
  reminder_recurring?: boolean;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

// ============================================================================
// VALIDATION UUID
// ============================================================================

// ⚠️ REGEX UUID STRICTE (RFC 4122 compliant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // ⚠️ BLOQUER EXPLICITEMENT "events" et autres valeurs invalides
  const invalidValues = ["events", "calendar", "event", "table", "null", "undefined", ""];
  if (invalidValues.includes(value.toLowerCase())) {
    return false;
  }
  
  // ⚠️ VÉRIFIER LE FORMAT UUID STRICT
  return UUID_REGEX.test(value);
}

function validateUUIDField(fieldName: string, value: any): void {
  if (!isValidUUID(value)) {
    const error = new Error(`Champ ${fieldName} invalide : attendu UUID, reçu "${value}" (type: ${typeof value})`);
    console.error(`❌ [useEvents] Validation UUID échouée:`, {
      fieldName,
      value,
      valueType: typeof value,
      valueLength: value?.length,
    });
    throw error;
  }
}

// ============================================================================
// HOOKS
// ============================================================================

export const useEvents = (startDate?: Date, endDate?: Date) => {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["events", currentCompanyId, startDate, endDate],
    queryFn: async () => {
      if (!currentCompanyId) {
        console.warn("⚠️ [useEvents] Pas de company_id, retour vide");
        return [];
      }

      let query = supabase
        .from("events")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("start_date", { ascending: true });

      if (startDate) {
        query = query.gte("start_date", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("start_date", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ [useEvents] Erreur récupération:", error);
        throw error;
      }

      return (data || []) as Event[];
    },
    enabled: !!currentCompanyId,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { data: googleConnection } = useGoogleCalendarConnection();
  const syncWithGoogle = useSyncEventWithGoogle();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      // 1️⃣ Récupérer l'utilisateur actuel
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user || !user.id) {
        throw new Error('Utilisateur non connecté');
      }
      
      const userId = user.id;

      // 2️⃣ Récupérer l'id de la société depuis company_users
      const { data: companyUserData, error: companyError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (companyError || !companyUserData?.company_id) {
        throw new Error('Company ID manquant');
      }
      
      const companyId = companyUserData.company_id;

      // 3️⃣ Validation des UUIDs
      if (!isValidUUID(userId)) {
        throw new Error('user_id invalide');
      }
      if (!isValidUUID(companyId)) {
        throw new Error('company_id invalide');
      }

      // 4️⃣ Préparer le payload propre
      const payload: Record<string, any> = {
        user_id: userId,
        company_id: companyId,
        title: data.title.trim(),
        start_date: data.start_date,
        all_day: data.all_day ?? false,
        type: data.type || "meeting",
        color: data.color || "#3b82f6",
      };

      // Champs optionnels
      if (data.description && data.description.trim()) {
        payload.description = data.description.trim();
      }
      
      if (data.end_date && data.end_date.trim()) {
        payload.end_date = data.end_date;
      }
      
      if (data.location && data.location.trim()) {
        payload.location = data.location.trim();
      }
      
      if (data.project_id && isValidUUID(data.project_id)) {
        payload.project_id = data.project_id;
      }
      
      if (typeof data.reminder_minutes === 'number' && data.reminder_minutes >= 0) {
        payload.reminder_minutes = data.reminder_minutes;
      }
      
      if (typeof data.reminder_recurring === 'boolean') {
        payload.reminder_recurring = data.reminder_recurring;
      }

      console.log('DEBUG EVENT PAYLOAD', payload); // pour vérifier avant l'insertion

      // 5️⃣ Insert dans Supabase
      const { data: event, error } = await supabase
        .from('events')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        console.error('Erreur insertion event:', error);
        throw error;
      }
      
      console.log("✅ [useCreateEvent] Événement créé avec succès:", event);

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          await syncWithGoogle.mutateAsync({
            action: "create",
            eventId: event.id,
          });
          console.log("✅ [useCreateEvent] Événement synchronisé avec Google Calendar");
        } catch (syncError) {
          console.error("⚠️ [useCreateEvent] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer la création si la sync échoue
        }
      }

      return event as Event;

      if (error) {
        console.error("❌ [useCreateEvent] Erreur insertion Supabase:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          // Log de l'objet envoyé pour debug (payload final nettoyé)
          payload_sent: JSON.stringify(finalPayload, null, 2),
          payload_original: JSON.stringify(insertData, null, 2),
        });
        throw error;
      }
      
      console.log("✅ [useCreateEvent] Événement créé avec succès:", event);

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          await syncWithGoogle.mutateAsync({
            action: "create",
            eventId: event.id,
          });
          console.log("✅ [useCreateEvent] Événement synchronisé avec Google Calendar");
        } catch (syncError) {
          console.error("⚠️ [useCreateEvent] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer la création si la sync échoue
        }
      }

      return event as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const { id, ...updateData } = data;

      if (!isValidUUID(id)) {
        throw new Error("ID d'événement invalide");
      }

      const { data: event, error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", currentCompanyId || "")
        .select("*")
        .single();

      if (error) {
        console.error("❌ [useUpdateEvent] Erreur:", error);
        throw error;
      }

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          await syncWithGoogle.mutateAsync({
            action: "update",
            eventId: id,
          });
          console.log("✅ [useUpdateEvent] Événement synchronisé avec Google Calendar");
        } catch (syncError) {
          console.error("⚠️ [useUpdateEvent] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer la mise à jour si la sync échoue
        }
      }

      return event as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();
  const { data: googleConnection } = useGoogleCalendarConnection();
  const syncWithGoogle = useSyncEventWithGoogle();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isValidUUID(id)) {
        throw new Error("ID d'événement invalide");
      }

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("company_id", currentCompanyId || "");

      if (error) {
        console.error("❌ [useDeleteEvent] Erreur:", error);
        throw error;
      }

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          await syncWithGoogle.mutateAsync({
            action: "delete",
            eventId: id,
          });
          console.log("✅ [useDeleteEvent] Événement supprimé de Google Calendar");
        } catch (syncError) {
          console.error("⚠️ [useDeleteEvent] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer la suppression si la sync échoue
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};
