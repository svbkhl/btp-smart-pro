import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_EVENTS } from "@/fakeData/calendar";
import { MOCK_EVENTS } from "@/utils/mockData"; // Pour compatibilité
import { useAuth } from "./useAuth";

export interface Event {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day: boolean;
  location?: string;
  type: "meeting" | "task" | "deadline" | "reminder" | "other";
  color: string;
  reminder_minutes?: number;
  reminder_recurring?: boolean;
  created_at: string;
  updated_at: string;
  project_name?: string;
}

export interface CreateEventData {
  project_id?: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  location?: string;
  type?: "meeting" | "task" | "deadline" | "reminder" | "other";
  color?: string;
  reminder_minutes?: number;
  reminder_recurring?: boolean;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

// Récupérer tous les événements
export const useEvents = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ["events", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          // Vérifier que les dates sont valides avant de les utiliser
          const hasValidDates = startDate && endDate && 
            startDate instanceof Date && 
            endDate instanceof Date &&
            !isNaN(startDate.getTime()) && 
            !isNaN(endDate.getTime());

          // Construire la requête de base
          let query = supabase
            .from("events")
            .select("*")
            .order("start_date", { ascending: true });

          // Appliquer les filtres uniquement si les dates sont valides
          if (hasValidDates) {
            const startISO = startDate.toISOString();
            const endISO = endDate.toISOString();
            
            // Vérifier que les dates ne sont pas undefined avant d'appliquer les filtres
            if (startISO && endISO) {
              query = query
                .gte("start_date", startISO)
                .lte("start_date", endISO);
            }
          }

          const { data, error } = await query;

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            // Si fake data activé → retourne FAKE_EVENTS
            // Si fake data désactivé → retourne []
            throw error;
          }

          // Récupérer les noms de projets séparément si nécessaire
          const eventsWithProjects = await Promise.all(
            (data || []).map(async (event: any) => {
              let project_name: string | undefined;
              
              if (event.project_id) {
                try {
                  const { data: project } = await supabase
                    .from("projects")
                    .select("name")
                    .eq("id", event.project_id)
                    .single();
                  project_name = project?.name;
                } catch (err) {
                  // Ignorer les erreurs de récupération du projet
                  console.warn("Erreur récupération projet:", err);
                }
              }
              
              return {
                ...event,
                project_name,
              } as Event;
            })
          );

          // Retourner les vraies données (même si vide)
          // queryWithTimeout gère le fallback automatiquement
          return eventsWithProjects;
        },
        FAKE_EVENTS,
        "useEvents"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000, // 5 minutes
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
    refetchInterval: 60000, // Polling automatique toutes les 60s
  });
};

// Récupérer les événements du jour
export const useTodayEvents = () => {
  return useQuery({
    queryKey: ["events", "today"],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // Vérifier que les dates sont valides
          const todayISO = today.toISOString();
          const tomorrowISO = tomorrow.toISOString();

          if (!todayISO || !tomorrowISO) {
            console.error('Invalid date range for today events');
            return [];
          }

          const { data, error } = await supabase
            .from("events")
            .select("*")
            .gte("start_date", todayISO)
            .lt("start_date", tomorrowISO)
            .order("start_date", { ascending: true });

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            // Si fake data activé → retourne FAKE_EVENTS filtrés
            // Si fake data désactivé → retourne []
            throw error;
          }

          // Récupérer les noms de projets séparément si nécessaire
          const eventsWithProjects = await Promise.all(
            (data || []).map(async (event: any) => {
              let project_name: string | undefined;
              
              if (event.project_id) {
                try {
                  const { data: project } = await supabase
                    .from("projects")
                    .select("name")
                    .eq("id", event.project_id)
                    .single();
                  project_name = project?.name;
                } catch (err) {
                  // Ignorer les erreurs de récupération du projet
                  console.warn("Erreur récupération projet:", err);
                }
              }
              
              return {
                ...event,
                project_name,
              } as Event;
            })
          );

          // Retourner les vraies données (même si vide)
          // queryWithTimeout gère le fallback automatiquement
          return eventsWithProjects;
        },
        FAKE_EVENTS.filter(e => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const eventDate = new Date(e.start_date);
          return eventDate >= today && eventDate < tomorrow;
        }),
        "useTodayEvents"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
    refetchInterval: 60000, // Polling automatique toutes les 60s
  });
};

// Créer un événement
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      // Vérifier que l'utilisateur est connecté
      if (!user) {
        throw new Error("Vous devez être connecté pour créer un événement");
      }

      // Récupérer l'ID utilisateur de manière sécurisée
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData?.user?.id;

      if (!user_id) {
        throw new Error("Impossible de récupérer l'ID utilisateur");
      }

      // Vérifier que start_date est présent et valide
      if (!data.start_date || typeof data.start_date !== 'string') {
        throw new Error('start_date is required and must be a valid ISO string');
      }

      // Construire l'objet d'insertion - NE JAMAIS inclure 'id' ou utiliser .eq() sur un insert
      const insertData: any = {
        user_id: user_id, // ✅ OBLIGATOIRE : Inclure le user_id
        title: data.title,
        start_date: data.start_date,
        all_day: data.all_day ?? false,
        type: data.type ?? "meeting",
        color: data.color ?? "#3b82f6",
      };

      // Ajouter uniquement les champs optionnels s'ils sont définis
      if (data.description) insertData.description = data.description;
      if (data.end_date) insertData.end_date = data.end_date;
      if (data.location) insertData.location = data.location;
      
      // ⚠️ IMPORTANT : Valider project_id pour éviter les UUID invalides
      // Ne jamais accepter "events", "none", "", ou toute autre chaîne non-UUID
      if (data.project_id && 
          data.project_id.trim() !== "" &&
          data.project_id !== "none" && 
          data.project_id !== "events" &&
          data.project_id !== "null" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.project_id)) {
        insertData.project_id = data.project_id;
      } else if (data.project_id) {
        // Log si project_id est fourni mais n'est pas un UUID valide
        console.warn("⚠️ [useCreateEvent] project_id invalide ignoré:", data.project_id);
      }
      // Si project_id est invalide, ne pas l'inclure (sera NULL dans la DB)
      
      if (data.reminder_minutes !== undefined) insertData.reminder_minutes = data.reminder_minutes;
      if (data.reminder_recurring !== undefined) insertData.reminder_recurring = data.reminder_recurring;

      // ⚠️ Vérification finale AVANT l'insertion : S'assurer qu'aucun champ UUID ne contient "events"
      // Vérifier tous les champs qui pourraient être des UUID
      const uuidFields = ['user_id', 'project_id'];
      for (const field of uuidFields) {
        if (insertData[field] === "events" || insertData[field] === "none" || insertData[field] === "") {
          console.error(`❌ [useCreateEvent] ERREUR : Valeur invalide '${insertData[field]}' détectée dans ${field}!`, {
            field,
            value: insertData[field],
            allFields: insertData,
          });
          // Supprimer le champ invalide au lieu de throw pour éviter de bloquer
          delete insertData[field];
        }
      }

      // Log pour déboguer - Vérifier tous les champs UUID
      console.log("🔍 [useCreateEvent] Insertion événement:", {
        user_id: insertData.user_id,
        project_id: insertData.project_id,
        title: insertData.title,
        start_date: insertData.start_date,
        auth_uid: user_id,
        allFields: insertData, // ✅ Afficher tous les champs pour déboguer
      });

      // ⚠️ IMPORTANT : Insertion simple sans aucun filtre .eq()
      // Ne jamais utiliser .eq("id", ...) ou tout autre filtre lors d'un insert
      const { data: event, error } = await supabase
        .from("events")
        .insert([insertData]) // ✅ Utiliser un tableau
        .select("*") // ✅ Sélectionner toutes les colonnes retournées
        .single(); // ✅ Retourner un seul objet

      if (error) {
        console.error("❌ [useCreateEvent] Erreur insertion:", error);
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        throw error;
      }
      
      console.log("✅ [useCreateEvent] Événement créé:", event);
      return event as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

// Mettre à jour un événement
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const { id, ...updateData } = data;
      const { data: event, error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return event as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

// Supprimer un événement
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

