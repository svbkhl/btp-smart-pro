// ============================================================================
// 🔄 HOOKS SYNCHRONISATION PLANNING GOOGLE CALENDAR
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { syncWithGoogleCalendar } from "@/services/googleCalendarService";

/**
 * Synchronise un planning avec Google Calendar
 */
export const useSyncPlanningWithGoogle = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      action,
      assignmentId,
    }: {
      action: "create" | "update" | "delete";
      assignmentId: string;
    }) => {
      if (!currentCompanyId) {
        throw new Error("Company ID manquant");
      }

      try {
        await syncWithGoogleCalendar({
          action,
          assignmentId,
          eventType: "planning",
          companyId: currentCompanyId,
        });

        // Invalider les caches
        queryClient.invalidateQueries({ queryKey: ["planning"] });
        queryClient.invalidateQueries({ queryKey: ["employee_assignments"] });
      } catch (error) {
        console.error(`❌ [useSyncPlanningWithGoogle] Erreur ${action}:`, error);
        // Ne pas bloquer l'opération si la sync échoue
      }
    },
  });
};

/**
 * Synchronise tous les plannings de l'entreprise avec Google Calendar
 */
export const useSyncAllPlanningsWithGoogle = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentCompanyId) {
        throw new Error("Company ID manquant");
      }

      const { data, error } = await supabase.functions.invoke("google-calendar-sync-entreprise", {
        body: {
          action: "sync_all_plannings",
          company_id: currentCompanyId,
        },
      });

      if (error) {
        console.error("❌ [useSyncAllPlanningsWithGoogle] Erreur:", error);
        throw error;
      }

      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      queryClient.invalidateQueries({ queryKey: ["employee_assignments"] });

      return data;
    },
  });
};
