// ============================================================================
// 🔗 HOOKS GOOGLE CALENDAR
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleCalendarConnection {
  id: string;
  company_id: string;
  owner_user_id: string;
  google_email: string;
  calendar_id: string;
  calendar_name: string;
  sync_direction: "app_to_google" | "bidirectional" | "google_to_app";
  sync_planning_enabled: boolean;
  enabled: boolean;
  expires_at: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Récupère la connexion Google Calendar active de l'entreprise
 */
export const useGoogleCalendarConnection = () => {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["google_calendar_connection", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) {
        return null;
      }

      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("company_id", currentCompanyId)
        .eq("enabled", true)
        .maybeSingle();

      if (error) {
        console.error("❌ [useGoogleCalendarConnection] Erreur:", error);
        throw error;
      }

      return data as GoogleCalendarConnection | null;
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Obtient l'URL d'authentification Google
 */
export const useGetGoogleAuthUrl = () => {
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentCompanyId) {
        throw new Error("Company ID manquant");
      }

      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise", {
        body: { action: "get_auth_url" },
      });

      if (error) {
        console.error("❌ [useGetGoogleAuthUrl] Erreur:", error);
        throw error;
      }

      return data.auth_url as string;
    },
  });
};

/**
 * Échange le code d'autorisation contre des tokens
 */
export const useExchangeGoogleCode = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!currentCompanyId) {
        throw new Error("Company ID manquant");
      }

      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise", {
        body: { action: "exchange_code", code },
      });

      if (error) {
        console.error("❌ [useExchangeGoogleCode] Erreur:", error);
        throw error;
      }

      // Invalider le cache de la connexion
      queryClient.invalidateQueries({ queryKey: ["google_calendar_connection"] });

      return data;
    },
  });
};

/**
 * Déconnecte Google Calendar
 */
export const useDisconnectGoogleCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise", {
        body: { action: "disconnect", connection_id: connectionId },
      });

      if (error) {
        console.error("❌ [useDisconnectGoogleCalendar] Erreur:", error);
        throw error;
      }

      // Invalider le cache
      queryClient.invalidateQueries({ queryKey: ["google_calendar_connection"] });

      return data;
    },
  });
};

/**
 * Synchronise un événement avec Google Calendar
 */
export const useSyncEventWithGoogle = () => {
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      action, 
      eventId 
    }: { 
      action: "create" | "update" | "delete";
      eventId: string;
    }) => {
      if (!currentCompanyId) {
        throw new Error("Company ID manquant");
      }

      const { data, error } = await supabase.functions.invoke("google-calendar-sync-entreprise", {
        body: {
          action,
          event_id: eventId,
          company_id: currentCompanyId,
          event_type: "event",
        },
      });

      if (error) {
        console.error(`❌ [useSyncEventWithGoogle] Erreur ${action}:`, error);
        throw error;
      }

      return data;
    },
  });
};
