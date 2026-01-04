import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface InboxEmail {
  id: string;
  user_id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  received_at: string;
  external_id: string | null;
  thread_id: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  folder: "inbox" | "sent" | "drafts" | "archived" | "trash";
  attachments: any[] | null;
  headers: any | null;
  created_at: string;
  updated_at: string;
}

interface UseInboxEmailsOptions {
  folder?: "inbox" | "sent" | "drafts" | "archived" | "trash";
  limit?: number;
  offset?: number;
}

/**
 * Hook pour récupérer les emails entrants (inbox)
 */
export const useInboxEmails = (options: UseInboxEmailsOptions = {}) => {
  const { user } = useAuth();
  const {
    folder = "inbox",
    limit = 50,
    offset = 0,
  } = options;

  return useQuery({
    queryKey: ["inbox_emails", user?.id, folder, limit, offset],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      let query = supabase
        .from("inbox_emails")
        .select("*")
        .eq("user_id", user.id)
        .eq("folder", folder)
        .eq("is_deleted", false)
        .order("received_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        // Si la table n'existe pas, retourner un tableau vide SILENCIEUSEMENT
        // (pas de log car cette table est pour une fonctionnalité future)
        if (error.code === "PGRST116" || error.message?.includes("does not exist") || error.code === "42P01") {
          return { data: [], count: 0 };
        }
        throw error;
      }

      return {
        data: (data || []) as InboxEmail[],
        count: count || 0,
      };
    },
    enabled: !!user,
  });
};

/**
 * Hook pour synchroniser les emails entrants depuis Gmail/Outlook
 */
export const useSyncInboxEmails = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sync_inbox_emails", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-inbox-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sync inbox emails");
      }

      return await response.json();
    },
    enabled: false, // Ne pas exécuter automatiquement
    retry: false,
  });
};





