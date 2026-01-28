import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { useCompanyId } from "./useCompanyId";
import { logger } from "@/utils/logger";
import { QUERY_CONFIG } from "@/utils/reactQueryConfig";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "urgent" | "success" | "error";
  related_table?: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

const FAKE_NOTIFICATIONS: Notification[] = [
  {
    id: "fake-notif-1",
    user_id: "fake-user",
    title: "Nouveau projet créé",
    message: "Le projet 'Rénovation toiture' a été créé avec succès",
    type: "success",
    related_table: "projects",
    related_id: "fake-proj-1",
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "fake-notif-2",
    user_id: "fake-user",
    title: "Devis en attente",
    message: "Vous avez 3 devis en attente de validation",
    type: "warning",
    related_table: "quotes",
    is_read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "fake-notif-3",
    user_id: "fake-user",
    title: "Projet en retard",
    message: "Le projet 'Extension garage' est en retard",
    type: "urgent",
    related_table: "projects",
    related_id: "fake-proj-2",
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read_at: new Date(Date.now() - 86400000 + 1000).toISOString(),
  },
];

export const useNotifications = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();
  const queryClient = useQueryClient();

  // Récupérer les notifications
  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ["notifications", companyId],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");
          if (!companyId) {
            logger.warn("useNotifications: No company_id available");
            return [];
          }

          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (error) {
            const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
            if (isFakeDataEnabled()) {
              return FAKE_NOTIFICATIONS;
            }
            throw error;
          }

          if (!data || data.length === 0) {
            const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
            if (isFakeDataEnabled()) {
              return FAKE_NOTIFICATIONS;
            }
            return [];
          }

          return data as Notification[];
        },
        FAKE_NOTIFICATIONS,
        "useNotifications"
      );
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.REALTIME, // Cache temps réel : 30s staleTime, refetch toutes les 60s
  });

  // Compter les notifications non lues
  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  // Marquer comme lu
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("User must be a member of a company");
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
    },
  });

  // Marquer toutes comme lues
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("User must be a member of a company");
      }

      const unreadIds = notifications
        ?.filter((n) => !n.is_read)
        .map((n) => n.id) || [];

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", unreadIds)
        .eq("company_id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
    },
  });

  return {
    notifications: notifications || [],
    isLoading,
    error,
    unreadCount,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingAsRead: markAsRead.isPending,
    isMarkingAllAsRead: markAllAsRead.isPending,
  };
};




















