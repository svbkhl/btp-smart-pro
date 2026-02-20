import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, Bot, User, X, Minimize2, Sparkles, Trash2 } from "lucide-react";
import { callAIAssistant } from "@/services/aiService";
import { useChatbotConversations, useCreateConversation, useDeleteConversation } from "@/hooks/useConversations";
import { useMessages, useCreateMessage } from "@/hooks/useMessages";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export const FloatingAIAssistant = () => {
  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Ne pas afficher le bouton sur les pages d'erreur (404, etc.)
  // Vérifier si on est sur une route qui n'existe pas (détectée par React Router)
  // Les routes invalides sont généralement celles qui ne correspondent à aucune route définie
  // On peut détecter cela en vérifiant si le pathname ne correspond à aucune route connue
  // Pour simplifier, on cache le bouton si le pathname contient des segments suspects
  const isErrorPage = location.pathname.includes('/404') || 
                      location.pathname.includes('/error') ||
                      location.pathname.includes('/not-found');
  
  // Si c'est une page d'erreur, ne pas afficher le bouton
  if (isErrorPage) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingResponse, setPendingResponse] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Utiliser le hook spécialisé pour les conversations chatbot uniquement
  const { data: conversations = [] } = useChatbotConversations(false);
  const { data: messages = [] } = useMessages(selectedConversationId);
  const createConversation = useCreateConversation();
  const createMessage = useCreateMessage();
  const deleteConversation = useDeleteConversation();

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pendingResponse, isOpen, isMinimized]);

  // Sélectionner la première conversation au chargement
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Focus sur l'input quand la fenêtre s'ouvre
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage("");
    setLoading(true);

    try {
      // Créer une conversation si nécessaire
      let conversationId = selectedConversationId;
      if (!conversationId) {
        const newConv = await createConversation.mutateAsync({
          title: userMessage.substring(0, 50),
          metadata: { type: "chatbot" }, // Marquer comme conversation chatbot
        });
        conversationId = newConv.id;
        setSelectedConversationId(conversationId);
      }

      // Sauvegarder le message utilisateur
      await createMessage.mutateAsync({
        conversation_id: conversationId,
        content: userMessage,
        role: "user",
      });

      // Préparer l'historique pour l'IA
      const history = messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      console.log("🚀 Chatbot: Appel de l'IA avec:", {
        message: userMessage,
        conversationId,
        historyLength: history.length,
      });

      // Appeler l'IA avec le contexte de la page actuelle
      let response;
      try {
        response = await callAIAssistant({
          message: userMessage,
          history: history,
          conversationId: conversationId,
          currentPage: location.pathname,
          context: {
            timestamp: new Date().toISOString(),
            type: "chatbot",
            page: location.pathname,
          },
        });

        console.log("📥 Chatbot: Réponse reçue de l'IA:", response);
      } catch (callError: any) {
        console.error("❌ Chatbot: Erreur lors de l'appel à l'IA:", callError);
        throw new Error(`Erreur lors de l'appel à l'IA: ${callError.message || "Erreur inconnue"}`);
      }

      // Vérifier que la réponse existe
      if (!response) {
        console.error("❌ Chatbot: Réponse vide reçue");
        throw new Error("L'IA n'a pas généré de réponse. Veuillez réessayer.");
      }

      // Extraire la réponse (gérer différents formats)
      let aiResponseText: string | null = null;
      
      if (typeof response === 'string') {
        aiResponseText = response;
      } else if (response.response) {
        aiResponseText = response.response;
      } else if (response.data?.response) {
        aiResponseText = response.data.response;
      } else if (response.data && typeof response.data === 'string') {
        aiResponseText = response.data;
      }

      if (!aiResponseText || aiResponseText.trim().length === 0) {
        console.error("❌ Chatbot: Réponse IA vide ou invalide:", response);
        throw new Error("L'IA n'a pas généré de réponse valide. Veuillez réessayer.");
      }

      console.log("✅ Chatbot: Réponse IA extraite, longueur:", aiResponseText.length);

      // Afficher immédiatement la réponse dans l'interface
      setPendingResponse(aiResponseText);
      console.log("✅ Chatbot: Réponse IA affichée dans l'interface");

      // Sauvegarder la réponse de l'IA
      try {
        const savedMessage = await createMessage.mutateAsync({
          conversation_id: conversationId,
          content: aiResponseText,
          role: "assistant",
        });
        
        console.log("✅ Chatbot: Réponse IA sauvegardée dans conversation:", conversationId);
        
        // Mettre à jour immédiatement le cache React Query pour que le message soit visible
        queryClient.setQueryData(
          ["ai_messages", conversationId],
          (oldMessages: any[] = []) => [...oldMessages, savedMessage]
        );
        
        // Attendre un court instant pour que le composant se mette à jour
        // puis effacer pendingResponse une fois que le message est visible
        setTimeout(() => {
          setPendingResponse(null);
          console.log("✅ Chatbot: Message ajouté au cache, pendingResponse effacé");
        }, 100);
      } catch (saveError: any) {
        console.error("⚠️ Chatbot: Erreur lors de la sauvegarde de la réponse:", saveError);
        // Ne pas effacer la réponse en attente si la sauvegarde échoue
        // Elle restera visible dans l'interface
      }
    } catch (error: any) {
      console.error("❌ Chatbot: Erreur lors de l'envoi du message:", error);
      setPendingResponse(null); // Effacer la réponse en attente en cas d'erreur
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };


  return (
    <>
      {/* Bouton flottant */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200"
            >
              <Bot className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fenêtre de chat flottante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[380px] md:w-[400px] max-w-[400px]"
          >
            <GlassCard className="flex flex-col shadow-2xl border-2">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Assistant IA</h3>
                    <p className="text-xs text-muted-foreground">
                      Je peux vous aider avec l'application
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedConversationId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        if (!selectedConversationId) return;
                        
                        try {
                          await deleteConversation.mutateAsync(selectedConversationId);
                          // Sélectionner la première conversation restante ou aucune
                          const remainingConversations = conversations?.filter(
                            c => c.id !== selectedConversationId
                          ) || [];
                          
                          if (remainingConversations.length > 0) {
                            setSelectedConversationId(remainingConversations[0].id);
                          } else {
                            setSelectedConversationId(null);
                          }
                          
                          toast({
                            title: "Conversation supprimée",
                            description: "La conversation a été supprimée avec succès",
                          });
                        } catch (error: any) {
                          console.error("Erreur lors de la suppression:", error);
                          toast({
                            title: "Erreur",
                            description: error.message || "Impossible de supprimer la conversation",
                            variant: "destructive",
                          });
                        }
                      }}
                      title="Supprimer cette conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setIsMinimized(!isMinimized);
                    }}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setIsOpen(false);
                      setIsMinimized(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Contenu de la fenêtre */}
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                  style={{ maxHeight: "400px", height: "400px" }}
                >
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4 min-h-0">
                    <div className="space-y-4">
                      {messages.length === 0 && !loading && (
                        <div className="text-center text-muted-foreground py-8">
                          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">
                            Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider ?
                          </p>
                          <p className="text-xs mt-2 text-muted-foreground">
                            Je peux répondre à vos questions, vous guider dans l'application, et vous aider à accomplir vos tâches.
                          </p>
                        </div>
                      )}

                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-lg p-3 ${
                              msg.role === "user"
                                ? "bg-primary/20 text-foreground border border-primary/30"
                                : "bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Afficher la réponse en attente si elle existe */}
                      {pendingResponse && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50 rounded-lg p-3 max-w-[85%]">
                            <p className="text-sm whitespace-pre-wrap break-words">{pendingResponse}</p>
                          </div>
                        </div>
                      )}

                      {loading && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50 rounded-lg p-3">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                        placeholder="Tapez votre message..."
                        disabled={loading}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={loading || !message.trim()}
                        size="icon"
                        className="shrink-0"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

