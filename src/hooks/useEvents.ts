import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_EVENTS } from "@/fakeData/calendar";
import { MOCK_EVENTS } from "@/utils/mockData"; // Pour compatibilité

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
          let query = supabase
            .from("events")
            .select(`
              *,
              projects (
                name
              )
            `)
            .order("start_date", { ascending: true ,
    throwOnError: false,
  });

          if (startDate && endDate) {
            query = query
              .gte("start_date", startDate.toISOString())
              .lte("start_date", endDate.toISOString());
          }

          const { data, error } = await query;

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            // Si fake data activé → retourne FAKE_EVENTS
            // Si fake data désactivé → retourne []
            throw error;
          }

          const events = (data || []).map((event: any) => ({
            ...event,
            project_name: event.projects?.name,
          })) as Event[];

          // Retourner les vraies données (même si vide)
          // queryWithTimeout gère le fallback automatiquement
          return events;
        },
        FAKE_EVENTS,
        "useEvents"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000, // 5 minutes
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
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

          const { data, error } = await supabase
            .from("events")
            .select(`
              *,
              projects (
                name
              )
            `)
            .gte("start_date", today.toISOString())
            .lt("start_date", tomorrow.toISOString())
            .order("start_date", { ascending: true });

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            // Si fake data activé → retourne FAKE_EVENTS filtrés
            // Si fake data désactivé → retourne []
            throw error;
          }

          const events = (data || []).map((event: any) => ({
            ...event,
            project_name: event.projects?.name,
          })) as Event[];

          // Retourner les vraies données (même si vide)
          // queryWithTimeout gère le fallback automatiquement
          return events;
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
  });
};

// Créer un événement
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      const { data: event, error } = await supabase
        .from("events")
        .insert({
          ...data,
          all_day: data.all_day ?? false,
          type: data.type ?? "meeting",
          color: data.color ?? "#3b82f6",
        })
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

