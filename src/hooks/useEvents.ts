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
      // ✅ RÉCUPÉRER L'UTILISATEUR DIRECTEMENT DEPUIS SUPABASE
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        console.error("❌ [useCreateEvent] Erreur auth:", authError);
        throw new Error("Vous devez être connecté pour créer un événement");
      }

      const user_id = currentUser.id;

      console.log("🔍 [useCreateEvent] User ID récupéré:", {
        user_id,
        user_id_type: typeof user_id,
        user_id_length: user_id?.length,
      });

      // Vérifier que user_id est un UUID valide
      if (!user_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
        console.error("❌ [useCreateEvent] user_id invalide:", user_id);
        throw new Error(`Erreur d'authentification : ID utilisateur invalide. Veuillez vous déconnecter et vous reconnecter.`);
      }

      // ✅ RÉCUPÉRER LE company_id depuis company_users
      const { data: companyUserData, error: companyError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user_id)
        .single();

      if (companyError || !companyUserData?.company_id) {
        console.error("❌ [useCreateEvent] Erreur company_id:", companyError);
        throw new Error("Impossible de récupérer votre entreprise. Veuillez contacter le support.");
      }

      const company_id = companyUserData.company_id;

      console.log("🔍 [useCreateEvent] Company ID récupéré:", company_id);

      // Vérifier que start_date est présent et valide
      if (!data.start_date || typeof data.start_date !== 'string') {
        throw new Error('La date de début est requise');
      }

      // Construire l'objet d'insertion
      const insertData: any = {
        user_id,
        company_id, // ✅ OBLIGATOIRE pour l'isolation multi-tenant
        title: data.title,
        start_date: data.start_date,
        all_day: data.all_day ?? false,
        type: data.type ?? "meeting",
        color: data.color ?? "#3b82f6",
      };

      // Champs optionnels
      if (data.description) insertData.description = data.description;
      if (data.end_date) insertData.end_date = data.end_date;
      if (data.location) insertData.location = data.location;
      if (data.reminder_minutes !== undefined) insertData.reminder_minutes = data.reminder_minutes;
      if (data.reminder_recurring !== undefined) insertData.reminder_recurring = data.reminder_recurring;
      
      // Valider project_id (doit être UUID ou ne pas être inclus)
      if (data.project_id && 
          data.project_id !== "none" && 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.project_id)) {
        insertData.project_id = data.project_id;
      }

      // Vérifier que company_id est un UUID valide
      if (!company_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company_id)) {
        console.error("❌ [useCreateEvent] company_id invalide:", company_id);
        throw new Error("Erreur : ID entreprise invalide. Veuillez contacter le support.");
      }

      // Log pour déboguer
      console.log("🔍 [useCreateEvent] Données à insérer:", {
        user_id: insertData.user_id,
        company_id: insertData.company_id,
        project_id: insertData.project_id || "null",
        title: insertData.title,
        start_date: insertData.start_date,
      });

      // Vérifier une dernière fois que user_id et company_id sont valides
      if (insertData.user_id === "events" || insertData.company_id === "events") {
        console.error("❌ [useCreateEvent] Erreur critique: user_id ou company_id = 'events'");
        console.error("❌ [useCreateEvent] insertData complet:", JSON.stringify(insertData, null, 2));
        throw new Error("Erreur critique : données invalides. Veuillez rafraîchir la page.");
      }

      // Log final avant insertion
      console.log("🔍 [useCreateEvent] Insertion finale:", {
        user_id: insertData.user_id,
        company_id: insertData.company_id,
        user_id_type: typeof insertData.user_id,
        company_id_type: typeof insertData.company_id,
        user_id_valid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.user_id),
        company_id_valid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.company_id),
      });

      // Insertion avec gestion d'erreur détaillée
      const { data: event, error } = await supabase
        .from("events")
        .insert([insertData])
        .select("*")
        .single();

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

