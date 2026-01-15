import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface EmailMessage {
  id: string;
  user_id: string;
  to_email: string; // Utiliser to_email au lieu de recipient_email pour correspondre à la table
  subject: string;
  body_html: string | null;
  body_text: string | null;
  email_type: string;
  status: "sent" | "failed" | "pending";
  external_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  invoice_id: string | null;
  quote_id: string | null;
  project_id: string | null;
  document_id?: string | null;
  document_type?: "quote" | "invoice" | null;
}

interface UseEmailMessagesOptions {
  limit?: number;
  offset?: number;
  orderBy?: "sent_at" | "created_at";
  orderDirection?: "asc" | "desc";
}

/**
 * Hook pour récupérer les emails envoyés avec pagination et tri
 */
export const useEmailMessages = (options: UseEmailMessagesOptions = {}) => {
  const { user } = useAuth();
  const {
    limit = 50,
    offset = 0,
    orderBy = "sent_at",
    orderDirection = "desc",
  } = options;

  return useQuery({
    queryKey: ["email_messages", user?.id, limit, offset, orderBy, orderDirection],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      let query = supabase
        .from("email_messages")
        .select("*")
        .eq("user_id", user.id)
        .order(orderBy || "sent_at", { ascending: orderDirection === "asc" })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        // Si la table n'existe pas, retourner un tableau vide
        if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
          console.warn("⚠️ Table email_messages n'existe pas encore");
          return { data: [], count: 0 };
        }
        throw error;
      }

      // Mapper recipient_email vers to_email pour compatibilité avec l'interface
      const mappedData = (data || []).map((msg: any) => ({
        ...msg,
        to_email: msg.recipient_email || msg.to_email || "",
      })) as EmailMessage[];

      return {
        data: mappedData,
        count: count || 0,
      };
    },
    enabled: !!user,
  });
};

/**
 * Hook pour récupérer un email spécifique par ID
 */
export const useEmailMessageById = (id: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email_message", id, user?.id],
    queryFn: async () => {
      if (!user || !id) throw new Error("User not authenticated or ID missing");

      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
          return null;
        }
        throw error;
      }

      // Mapper recipient_email vers to_email pour compatibilité
      if (data) {
        return {
          ...data,
          to_email: (data as any).recipient_email || (data as any).to_email || "",
        } as EmailMessage;
      }

      return null;
    },
    enabled: !!user && !!id,
  });
};








