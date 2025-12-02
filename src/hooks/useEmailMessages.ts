import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface EmailMessage {
  id: string;
  user_id: string;
  recipient_email: string;
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
}

export const useEmailMessages = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email_messages", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Si la table n'existe pas, retourner un tableau vide
        if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
          console.warn("⚠️ Table email_messages n'existe pas encore");
          return [];
        }
        throw error;
      }

      return (data || []) as EmailMessage[];
    },
    enabled: !!user,
  });
};




