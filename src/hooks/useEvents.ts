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

/**
 * Hook pour récupérer les événements d'aujourd'hui
 */
export const useTodayEvents = () => {
  const { currentCompanyId } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["events", "today", currentCompanyId, today],
    queryFn: async () => {
      if (!currentCompanyId) {
        return [];
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("company_id", currentCompanyId)
        .gte("start_date", today + "T00:00:00")
        .lte("start_date", today + "T23:59:59")
        .order("start_date", { ascending: true });

      if (error) {
        console.error("❌ [useTodayEvents] Erreur récupération:", error);
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
      // ============================================================================
      // ⚠️ SÉCURITÉ : Ne JAMAIS utiliser useParams(), router.query, ou route.params
      // ⚠️ Les UUID doivent TOUJOURS provenir de supabase.auth.getUser() ou de la DB
      // ⚠️ Cela empêche l'injection accidentelle de "events" depuis l'URL /events
      // ============================================================================

      // 1️⃣ Récupérer l'utilisateur actuel depuis Supabase Auth (SEULE SOURCE)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user || !user.id) {
        throw new Error('Utilisateur non connecté');
      }
      
      const userId = user.id;

      // 2️⃣ Récupérer l'id de la société depuis company_users (SEULE SOURCE)
      // ⚠️ NE JAMAIS utiliser currentCompanyId depuis useAuth() ou contexte
      // ⚠️ TOUJOURS récupérer depuis la base de données pour éviter la contamination
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

      // 3️⃣ Validation stricte des UUIDs (RFC 4122 compliant)
      // ⚠️ Bloque explicitement "events", "calendar", "event", etc.
      if (!isValidUUID(userId)) {
        throw new Error(`user_id invalide: "${userId}" (doit être un UUID valide, pas "events" ou autre valeur)`);
      }
      if (!isValidUUID(companyId)) {
        throw new Error(`company_id invalide: "${companyId}" (doit être un UUID valide, pas "events" ou autre valeur)`);
      }

      // 4️⃣ Préparer le payload propre et sécurisé
      // ⚠️ Construire le payload avec SEULEMENT les champs autorisés
      // ⚠️ Tous les UUID sont déjà validés (userId, companyId)
      const payload: Record<string, any> = {
        user_id: userId,        // ✅ UUID validé depuis auth.getUser()
        company_id: companyId,  // ✅ UUID validé depuis company_users
        title: data.title.trim(),
        start_date: data.start_date,
        all_day: data.all_day ?? false,
        type: data.type || "meeting",
        color: data.color || "#3b82f6",
      };

      // Champs optionnels (validation stricte)
      if (data.description && data.description.trim()) {
        payload.description = data.description.trim();
      }
      
      if (data.end_date && data.end_date.trim()) {
        payload.end_date = data.end_date;
      }
      
      if (data.location && data.location.trim()) {
        payload.location = data.location.trim();
      }
      
      // ⚠️ project_id : validation UUID stricte avant ajout
      if (data.project_id) {
        if (isValidUUID(data.project_id)) {
          payload.project_id = data.project_id;
        } else {
          console.warn(`⚠️ [useCreateEvent] project_id invalide ignoré: "${data.project_id}"`);
        }
      }
      
      if (typeof data.reminder_minutes === 'number' && data.reminder_minutes >= 0) {
        payload.reminder_minutes = data.reminder_minutes;
      }
      
      if (typeof data.reminder_recurring === 'boolean') {
        payload.reminder_recurring = data.reminder_recurring;
      }

      // ⚠️ DEBUG : Vérifier visuellement que tous les UUID sont corrects
      console.log('DEBUG EVENT PAYLOAD', payload);

      // 5️⃣ Insert sécurisé dans Supabase
      // ⚠️ Le payload ne contient QUE des UUID validés
      // ⚠️ Aucune valeur "events" ne peut être injectée
      const { data: event, error } = await supabase
        .from('events')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        console.error('Erreur insertion event:', error);
        console.error('Payload envoyé:', JSON.stringify(payload, null, 2));
        throw error;
      }
      
      console.log("✅ [useCreateEvent] Événement créé avec succès:", event);

      // 6️⃣ Synchroniser avec Google Calendar si connecté (niveau entreprise)
      // ⚠️ La synchronisation se fait via Edge Function Supabase (sécurisée)
      // ⚠️ Les tokens Google ne sont jamais exposés au front-end
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          console.log("🔄 [useCreateEvent] Synchronisation avec Google Calendar...");
          await syncWithGoogle.mutateAsync({
            action: "create",
            eventId: event.id,
          });
          console.log("✅ [useCreateEvent] Événement synchronisé avec Google Calendar");
        } catch (syncError: any) {
          console.error("⚠️ [useCreateEvent] Erreur synchronisation Google Calendar:", syncError);
          // ⚠️ Ne pas bloquer la création si la sync échoue
          // L'événement est déjà créé dans Supabase, la sync peut être réessayée plus tard
        }
      } else {
        console.log("ℹ️ [useCreateEvent] Synchronisation Google Calendar désactivée ou non connecté");
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
