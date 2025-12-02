import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useFakeDataStore } from "@/store/useFakeDataStore";

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  metadata: {
    type?: string; // btp, rh, devis, etc.
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  is_archived: boolean;
}

export interface CreateConversationData {
  title?: string;
  metadata?: Record<string, any>;
}

export interface UpdateConversationData {
  title?: string;
  metadata?: Record<string, any>;
  is_archived?: boolean;
}

const CONVERSATIONS_CACHE_KEY = "ai_conversations_cache";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Types de conversations
export type ConversationType = "btp" | "chatbot" | null;

// Hooks spécialisés pour chaque type de conversation
export const useBTPConversations = (archived = false) => {
  return useConversations(archived, "btp");
};

export const useChatbotConversations = (archived = false) => {
  return useConversations(archived, "chatbot");
};

// Cache local pour améliorer les performances (séparé par type)
const getCachedConversations = (userId: string, type: ConversationType = null): AIConversation[] | null => {
  try {
    const cacheKey = type 
      ? `${CONVERSATIONS_CACHE_KEY}_${userId}_${type}`
      : `${CONVERSATIONS_CACHE_KEY}_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setCachedConversations = (userId: string, conversations: AIConversation[], type: ConversationType = null) => {
  try {
    const cacheKey = type 
      ? `${CONVERSATIONS_CACHE_KEY}_${userId}_${type}`
      : `${CONVERSATIONS_CACHE_KEY}_${userId}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data: conversations, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
};

// Hook pour récupérer les conversations avec filtre par type
export const useConversations = (archived = false, conversationType: ConversationType = null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fakeDataEnabled } = useFakeDataStore();

  return useQuery({
    queryKey: ["ai_conversations", user?.id, archived, conversationType],
    queryFn: async () => {
      if (!user && !fakeDataEnabled) throw new Error("User not authenticated");
      
      // En mode démo, retourner un tableau vide (pas de fake conversations pour l'instant)
      if (fakeDataEnabled) {
        return [];
      }

      // Essayer le cache d'abord (avec le type)
      const cached = getCachedConversations(user.id, conversationType);
      if (cached) {
        // Charger en arrière-plan pour rafraîchir
        queryClient.prefetchQuery({
          queryKey: ["ai_conversations", user.id, archived, conversationType],
          queryFn: async () => {
            // Construire la requête - sélectionner seulement les colonnes qui existent
            let prefetchQuery = supabase
              .from("ai_conversations")
              .select("id, user_id, title, metadata, created_at, updated_at, is_archived, last_message_at")
              .eq("user_id", user.id)
              .eq("is_archived", archived);
            
            // Filtrer par type de conversation dans la requête SQL
            if (conversationType === "btp") {
              // Conversations BTP : type = "btp" UNIQUEMENT (séparation stricte)
              prefetchQuery = prefetchQuery.eq("metadata->>type", "btp");
            } else if (conversationType === "chatbot") {
              // Conversations chatbot : type = "chatbot" UNIQUEMENT (séparation stricte)
              prefetchQuery = prefetchQuery.eq("metadata->>type", "chatbot");
            }
            
            // Si on cherche les conversations actives (archived = false),
            // ne montrer QUE celles qui ont au moins un message (last_message_at IS NOT NULL)
            // Les conversations sans messages ne doivent pas apparaître dans "actives"
            if (!archived) {
              prefetchQuery = prefetchQuery.not("last_message_at", "is", null);
            }
            // Si archived = true, montrer TOUTES les conversations archivées (même sans messages)
            // car l'utilisateur les a explicitement archivées
            
            // Ordonner
            try {
              prefetchQuery = prefetchQuery.order("last_message_at", { ascending: false, nullsFirst: false });
            } catch (e) {
              prefetchQuery = prefetchQuery.order("created_at", { ascending: false });
            }
            
            try {
              prefetchQuery = prefetchQuery.order("updated_at", { ascending: false });
            } catch (e) {
              // Ignorer
            }
            
            let { data, error } = await prefetchQuery;

              // Si erreur 400 (colonne inexistante), essayer une requête simplifiée
              if (error && (error.code === "42703" || error.code === "PGRST116" || error.message?.includes("does not exist") || error.message?.includes("column"))) {
                let simpleQuery = supabase
                  .from("ai_conversations")
                  .select("id, user_id, title, metadata, created_at, updated_at")
                  .eq("user_id", user.id);
              
              // Pour les conversations actives, filtrer celles qui ont des messages
              if (!archived) {
                // On va filtrer côté client après récupération
              }
              
              const simpleResult = await simpleQuery
                .order("created_at", { ascending: false });
              
              data = simpleResult.data;
              error = simpleResult.error;
              
              // Filtrer côté client si nécessaire (pour les actives sans messages)
              if (!archived && data && Array.isArray(data)) {
                // Vérifier quelles conversations ont des messages
                const conversationsWithMessages = await Promise.all(
                  data.map(async (conv) => {
                    const { count } = await supabase
                      .from("ai_messages")
                      .select("*", { count: "exact", head: true })
                      .eq("conversation_id", conv.id);
                    return { conv, hasMessages: (count || 0) > 0 };
                  })
                );
                
                data = conversationsWithMessages
                  .filter(({ hasMessages }) => hasMessages)
                  .map(({ conv }) => conv) as AIConversation[];
              }
            }

            if (error) throw error;
            const conversations = (data || []) as AIConversation[];
            setCachedConversations(user.id, conversations, conversationType);
            return conversations;
          },
        });
        return cached;
      }

      // Construire la requête - sélectionner seulement les colonnes qui existent
      let query = supabase
        .from("ai_conversations")
        .select("id, user_id, title, metadata, created_at, updated_at, is_archived, last_message_at")
        .eq("user_id", user.id);
      
      // Filtrer par type de conversation dans la requête SQL (AVANT les autres filtres)
      if (conversationType === "btp") {
        // Conversations BTP : type = "btp" UNIQUEMENT (séparation stricte)
        query = query.eq("metadata->>type", "btp");
      } else if (conversationType === "chatbot") {
        // Conversations chatbot : type = "chatbot" UNIQUEMENT (séparation stricte)
        query = query.eq("metadata->>type", "chatbot");
      }
      
      // IMPORTANT : Les conversations ne sont archivées QUE manuellement par l'utilisateur
      // Si on cherche les conversations actives (archived = false), 
      // ne montrer que celles qui ont au moins un message (last_message_at IS NOT NULL)
      // Mais d'abord, vérifier si les colonnes existent
      try {
        if (!archived) {
          // Filtrer : is_archived = false ET last_message_at IS NOT NULL
          query = query.eq("is_archived", false);
          query = query.not("last_message_at", "is", null);
        } else {
          // Pour les archives : seulement celles explicitement archivées par l'utilisateur
          query = query.eq("is_archived", true);
        }
      } catch (e) {
        // Si les colonnes n'existent pas, on ne filtre pas par is_archived
        console.warn("Colonnes is_archived ou last_message_at non disponibles, utilisation d'une requête simplifiée");
      }
      
      // Ordonner
      try {
        query = query.order("last_message_at", { ascending: false, nullsFirst: false });
      } catch (e) {
        // Si last_message_at n'existe pas, utiliser created_at
        query = query.order("created_at", { ascending: false });
      }
      
      try {
        query = query.order("updated_at", { ascending: false });
      } catch (e) {
        // Ignorer si updated_at n'existe pas
      }
      
      let { data, error } = await query;

      // Si erreur 400 (colonne inexistante), essayer une requête simplifiée
      if (error && (error.code === "42703" || error.code === "PGRST116" || error.message?.includes("does not exist") || error.message?.includes("column"))) {
        console.warn("Certaines colonnes n'existent pas encore. Utilisation d'une requête simplifiée. Exécutez la migration SQL.");
        
        // Requête simplifiée sans les colonnes qui pourraient ne pas exister
        let simpleQuery = supabase
          .from("ai_conversations")
          .select("id, user_id, title, metadata, created_at, updated_at")
          .eq("user_id", user.id);
        
        // Essayer d'ajouter le filtre is_archived seulement si la colonne existe
        try {
          if (!archived) {
            simpleQuery = simpleQuery.eq("is_archived", false);
          } else {
            simpleQuery = simpleQuery.eq("is_archived", true);
          }
        } catch (e) {
          // Si is_archived n'existe pas, on ne filtre pas
          console.warn("Colonne is_archived non disponible");
        }
        
        const simpleResult = await simpleQuery
          .order("created_at", { ascending: false });
        
        data = simpleResult.data;
        error = simpleResult.error;
        
        // Si encore une erreur, essayer sans aucun filtre
        if (error && (error.code === "42703" || error.code === "PGRST116")) {
          const minimalQuery = supabase
            .from("ai_conversations")
            .select("id, user_id, title, metadata, created_at, updated_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          
          const minimalResult = await minimalQuery;
          data = minimalResult.data;
          error = minimalResult.error;
        }
        
        // Filtrer côté client pour les conversations actives (celles qui ont des messages)
        if (!archived && data && Array.isArray(data) && data.length > 0) {
          // Vérifier quelles conversations ont des messages
          const conversationsWithMessages = await Promise.all(
            data.map(async (conv) => {
              const { count } = await supabase
                .from("ai_messages")
                .select("*", { count: "exact", head: true })
                .eq("conversation_id", conv.id);
              return { conv, hasMessages: (count || 0) > 0 };
            })
          );
          
          // Filtrer : seulement les conversations qui ont des messages ET qui ne sont pas archivées
          data = conversationsWithMessages
            .filter(({ hasMessages, conv }) => hasMessages && !conv.is_archived)
            .map(({ conv }) => conv) as AIConversation[];
        } else if (archived && data && Array.isArray(data)) {
          // Pour les archives : s'assurer qu'elles sont bien archivées
          data = data.filter((conv: any) => conv.is_archived === true);
        }
      }

      if (error) {
        // Si erreur 404 (table n'existe pas), retourner un tableau vide
        if (error.code === "PGRST116" || error.message?.includes("does not exist") || error.message?.includes("42P01")) {
          console.warn("Table ai_conversations non accessible. Vérifiez que la migration a été exécutée.");
          return [];
        }
        const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
        if (isFakeDataEnabled()) {
          return [];
        }
        throw error;
      }

      const conversations = (data || []) as AIConversation[];
      setCachedConversations(user.id, conversations, conversationType);
      return conversations;
    },
    enabled: !!user || fakeDataEnabled,
    staleTime: 30000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook pour créer une nouvelle conversation
export const useCreateConversation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateConversationData) => {
      if (!user) throw new Error("User not authenticated");

      // Essayer d'abord avec le nouveau schéma (title, metadata)
      let insertData: any = {
        user_id: user.id,
        title: data.title || "Nouvelle conversation",
        metadata: data.metadata || {},
      };

      let { data: conversation, error } = await supabase
        .from("ai_conversations")
        .insert(insertData)
        .select("id, user_id, title, metadata, created_at, updated_at")
        .single();

      // Si erreur 23502 (NOT NULL constraint), essayer avec l'ancien schéma (message, response)
      if (error && (error.code === "23502" || error.message?.includes("null value") || error.message?.includes("message"))) {
        console.warn("Détection de l'ancien schéma avec message/response. Adaptation...");
        
        // Ancien schéma : message et response sont requis
        insertData = {
          user_id: user.id,
          message: data.title || "Nouvelle conversation",
          response: "", // Réponse vide pour l'instant
          context: data.metadata || {},
        };
        
        const oldSchemaResult = await supabase
          .from("ai_conversations")
          .insert(insertData)
          .select("id, user_id, message, response, context, created_at")
          .single();
        
        conversation = oldSchemaResult.data;
        error = oldSchemaResult.error;
        
        // Adapter les données de l'ancien schéma au nouveau format
        if (conversation && !error) {
          conversation = {
            id: conversation.id,
            user_id: conversation.user_id,
            title: conversation.message || data.title || "Nouvelle conversation",
            metadata: conversation.context || data.metadata || {},
            created_at: conversation.created_at,
            updated_at: conversation.created_at,
            last_message_at: null,
            is_archived: false,
          };
        }
      }

      // Si erreur 400/42703 (colonne inexistante), essayer avec colonnes minimales
      if (error && (error.code === "42703" || error.code === "PGRST116" || error.code === "400" || error.message?.includes("column") || error.message?.includes("does not exist"))) {
        console.warn("Erreur lors de la création, tentative avec colonnes minimales:", error.message);
        
        // Requête minimale avec seulement les colonnes absolument nécessaires
        const minimalData: any = {
          user_id: user.id,
        };
        
        // Essayer avec title
        try {
          minimalData.title = data.title || "Nouvelle conversation";
          const minimalResult = await supabase
            .from("ai_conversations")
            .insert(minimalData)
            .select("id, user_id, title, created_at")
            .single();
          
          conversation = minimalResult.data;
          error = minimalResult.error;
        } catch (e) {
          // Si title n'existe pas, essayer avec message
          try {
            delete minimalData.title;
            minimalData.message = data.title || "Nouvelle conversation";
            minimalData.response = "";
            
            const messageResult = await supabase
              .from("ai_conversations")
              .insert(minimalData)
              .select("id, user_id, message, created_at")
              .single();
            
            conversation = messageResult.data;
            error = messageResult.error;
            
            // Adapter au nouveau format
            if (conversation && !error) {
              conversation = {
                id: conversation.id,
                user_id: conversation.user_id,
                title: conversation.message || data.title || "Nouvelle conversation",
                metadata: {},
                created_at: conversation.created_at,
                updated_at: conversation.created_at,
                last_message_at: null,
                is_archived: false,
              };
            }
          } catch (e2) {
            console.error("Erreur même avec requête minimale:", e2);
          }
        }
      }

      if (error) {
        console.error("Erreur création conversation:", error);
        // Si c'est une erreur de table inexistante, retourner une conversation factice
        if (error.code === "PGRST116" || error.message?.includes("does not exist") || error.message?.includes("42P01")) {
          console.warn("Table ai_conversations non accessible. Création d'une conversation locale.");
          const fakeConversation: AIConversation = {
            id: `local-${Date.now()}`,
            user_id: user.id,
            title: data.title || "Nouvelle conversation",
            metadata: data.metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_at: null,
            is_archived: false,
          };
          return fakeConversation;
        }
        throw error;
      }
      
      // Compléter les données manquantes avec des valeurs par défaut
      const fullConversation: AIConversation = {
        id: conversation.id,
        user_id: conversation.user_id,
        title: conversation.title,
        metadata: conversation.metadata || data.metadata || {},
        created_at: conversation.created_at,
        updated_at: conversation.updated_at || conversation.created_at,
        last_message_at: conversation.last_message_at || null,
        is_archived: conversation.is_archived || false,
      };
      
      return fullConversation;
    },
    onSuccess: (conversation) => {
      // Invalider tous les caches (BTP et chatbot)
      queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
      // Mettre à jour le cache local selon le type de conversation
      if (user) {
        const conversationType = conversation.metadata?.type as ConversationType;
        const cached = getCachedConversations(user.id, conversationType) || [];
        setCachedConversations(user.id, [conversation, ...cached], conversationType);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la conversation",
        variant: "destructive",
      });
    },
  });
};

// Hook pour mettre à jour une conversation
export const useUpdateConversation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateConversationData & { id: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: conversation, error } = await supabase
        .from("ai_conversations")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return conversation as AIConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
      // Mettre à jour le cache local
      if (user) {
        queryClient.refetchQueries({ queryKey: ["ai_conversations", user.id] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la conversation",
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer une conversation
export const useDeleteConversation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      console.log("🗑️ Suppression de la conversation:", id);

      // Supprimer d'abord les messages associés (si CASCADE ne le fait pas automatiquement)
      const { error: messagesError } = await supabase
        .from("ai_messages")
        .delete()
        .eq("conversation_id", id);

      if (messagesError) {
        console.warn("⚠️ Erreur lors de la suppression des messages:", messagesError);
        // Continuer quand même la suppression de la conversation
      }

      // Supprimer la conversation
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Erreur lors de la suppression de la conversation:", error);
        throw error;
      }

      console.log("✅ Conversation supprimée avec succès:", id);
      return id;
    },
    onSuccess: (id) => {
      console.log("✅ onSuccess appelé pour la conversation:", id);
      // Invalider les caches pour forcer le rafraîchissement
      queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
      queryClient.invalidateQueries({ queryKey: ["ai_messages"] });
      
      // Invalider tous les caches (BTP et chatbot) car on ne connaît pas le type
      queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
      // Mettre à jour les caches locaux pour les deux types
      if (user) {
        // Nettoyer les caches BTP et chatbot
        const btpCached = getCachedConversations(user.id, "btp") || [];
        const chatbotCached = getCachedConversations(user.id, "chatbot") || [];
        const updatedBTPCache = btpCached.filter((c) => c.id !== id);
        const updatedChatbotCache = chatbotCached.filter((c) => c.id !== id);
        setCachedConversations(user.id, updatedBTPCache, "btp");
        setCachedConversations(user.id, updatedChatbotCache, "chatbot");
        console.log("✅ Caches locaux mis à jour, conversations restantes - BTP:", updatedBTPCache.length, "Chatbot:", updatedChatbotCache.length);
      }
    },
    onError: (error: Error) => {
      console.error("❌ Erreur dans onError:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la conversation",
        variant: "destructive",
      });
    },
  });
};

// Hook pour archiver/désarchiver une conversation
export const useArchiveConversation = () => {
  const updateConversation = useUpdateConversation();
  
  return {
    ...updateConversation,
    mutate: (id: string, isArchived: boolean) => {
      updateConversation.mutate({ id, is_archived: isArchived });
    },
  };
};

