import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  sequence_number: number;
}

export interface CreateMessageData {
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
  images?: string[];
}

const MESSAGES_CACHE_KEY = "ai_messages_cache";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Cache local pour améliorer les performances
const getCachedMessages = (conversationId: string): AIMessage[] | null => {
  try {
    const cached = safeLocalStorage.getItem(`${MESSAGES_CACHE_KEY}_${conversationId}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      safeLocalStorage.removeItem(`${MESSAGES_CACHE_KEY}_${conversationId}`);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setCachedMessages = (conversationId: string, messages: AIMessage[]) => {
  try {
    safeLocalStorage.setItem(
      `${MESSAGES_CACHE_KEY}_${conversationId}`,
      JSON.stringify({ data: messages, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
};

// Hook pour récupérer les messages d'une conversation
export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["ai_messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !user) return [];

      // Essayer le cache d'abord
      const cached = getCachedMessages(conversationId);
      if (cached) {
        // Charger en arrière-plan pour rafraîchir
        queryClient.prefetchQuery({
          queryKey: ["ai_messages", conversationId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from("ai_messages")
              .select("*")
              .eq("conversation_id", conversationId)
              .order("sequence_number", { ascending: true })
              .order("created_at", { ascending: true });

            if (error) throw error;
            const messages = (data || []) as AIMessage[];
            setCachedMessages(conversationId, messages);
            return messages;
          },
        });
        return cached;
      }

      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sequence_number", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        // Si erreur 404 (table n'existe pas), retourner un tableau vide
        if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
          console.warn("Table ai_messages non accessible. Vérifiez que la migration a été exécutée.");
          return [];
        }
        throw error;
      }

      const messages = (data || []) as AIMessage[];
      setCachedMessages(conversationId, messages);
      return messages;
    },
    enabled: !!conversationId && !!user,
    staleTime: 10000, // 10 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook pour créer un message
export const useCreateMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMessageData) => {
      if (!user) throw new Error("User not authenticated");

      // Récupérer le dernier sequence_number pour cette conversation
      const { data: lastMessage } = await supabase
        .from("ai_messages")
        .select("sequence_number")
        .eq("conversation_id", data.conversation_id)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .single();

      const nextSequence = (lastMessage?.sequence_number || 0) + 1;

      const metadata = {
        ...(data.metadata || {}),
        ...(data.images && data.images.length > 0 ? { images: data.images } : {}),
      };

      const { data: message, error } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: data.conversation_id,
          role: data.role,
          content: data.content,
          metadata: metadata,
          sequence_number: nextSequence,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Mettre à jour last_message_at de la conversation
      try {
        await supabase
          .from("ai_conversations")
          .update({ 
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", data.conversation_id);
      } catch (updateError) {
        // Si la colonne n'existe pas, on continue quand même
        console.warn("Impossible de mettre à jour last_message_at:", updateError);
      }
      
      return message as AIMessage;
    },
    onSuccess: (message) => {
      // Invalider le cache des messages
      queryClient.invalidateQueries({ queryKey: ["ai_messages", message.conversation_id] });
      // Invalider le cache des conversations (pour mettre à jour last_message_at)
      queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
      
      // Mettre à jour le cache local
      const cached = getCachedMessages(message.conversation_id) || [];
      setCachedMessages(message.conversation_id, [...cached, message]);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer un message
export const useDeleteMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, conversationId }: { id: string; conversationId: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("ai_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai_messages", variables.conversationId] });
      // Mettre à jour le cache local
      const cached = getCachedMessages(variables.conversationId) || [];
      setCachedMessages(
        variables.conversationId,
        cached.filter((m) => m.id !== variables.id)
      );
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le message",
        variant: "destructive",
      });
    },
  });
};

// Fonction utilitaire pour créer plusieurs messages en batch
export const useCreateMessagesBatch = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (messages: CreateMessageData[]) => {
      if (!user) throw new Error("User not authenticated");
      if (messages.length === 0) return [];

      const conversationId = messages[0].conversation_id;

      // Récupérer le dernier sequence_number
      const { data: lastMessage } = await supabase
        .from("ai_messages")
        .select("sequence_number")
        .eq("conversation_id", conversationId)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .single();

      let nextSequence = (lastMessage?.sequence_number || 0) + 1;

      const messagesToInsert = messages.map((msg) => ({
        conversation_id: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {},
        sequence_number: nextSequence++,
      }));

      const { data, error } = await supabase
        .from("ai_messages")
        .insert(messagesToInsert)
        .select();

      if (error) throw error;
      return (data || []) as AIMessage[];
    },
    onSuccess: (messages) => {
      if (messages.length > 0) {
        const conversationId = messages[0].conversation_id;
        queryClient.invalidateQueries({ queryKey: ["ai_messages", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
        
        // Mettre à jour le cache local
        const cached = getCachedMessages(conversationId) || [];
        setCachedMessages(conversationId, [...cached, ...messages]);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer les messages",
        variant: "destructive",
      });
    },
  });
};

