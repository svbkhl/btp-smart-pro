import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook optimisé pour récupérer uniquement le dernier message d'une conversation
 * Utilisé pour afficher l'aperçu dans la sidebar
 */
export const useLastMessage = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["ai_last_message", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from("ai_messages")
        .select("content, role, created_at")
        .eq("conversation_id", conversationId)
        .order("sequence_number", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Aucun message trouvé
          return null;
        }
        throw error;
      }

      return data;
    },
    enabled: !!conversationId,
    staleTime: 60000, // 1 minute
  });
};

