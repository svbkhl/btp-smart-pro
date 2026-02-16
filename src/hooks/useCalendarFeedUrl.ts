import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook pour récupérer l'URL du flux iCal du planning employé.
 * Permet d'ajouter le planning à Google Calendar via "Autres calendriers → Par URL".
 */
export function useCalendarFeedUrl() {
  const { user, currentCompanyId } = useAuth();

  const query = useQuery({
    queryKey: ["calendar-feed-url", user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user || !currentCompanyId) return null;
      const { data: token, error } = await supabase.rpc("get_or_create_calendar_feed_token", {
        p_company_id: currentCompanyId,
      });
      if (error) throw error;
      if (!token) return null;
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      return `${baseUrl}/functions/v1/planning-ical?token=${token}`;
    },
    enabled: !!user && !!currentCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    feedUrl: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
