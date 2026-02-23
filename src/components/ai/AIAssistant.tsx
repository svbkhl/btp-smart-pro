import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, Bot, User, ImagePlus, X, Trash2, Mic, MicOff } from "lucide-react";
import { callAIAssistant } from "@/services/aiService";
import { compressImagesForAI } from "@/utils/imageCompression";
import { useBTPConversations, useCreateConversation, useDeleteConversation } from "@/hooks/useConversations";
import { useMessages, useCreateMessage } from "@/hooks/useMessages";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useQueryClient } from "@tanstack/react-query";

export const AIAssistant = () => {
  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Utiliser le hook spécialisé pour les conversations BTP uniquement
  const { data: conversations = [] } = useBTPConversations(false);
  const { data: messages = [] } = useMessages(selectedConversationId);
  const createConversation = useCreateConversation();
  const createMessage = useCreateMessage();
  const deleteConversation = useDeleteConversation();

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingResponse]);

  // Sélectionner la première conversation au chargement
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleImageUpload = async (file: File) => {
    // Upload de l'image vers Supabase Storage
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Simuler l'upload pour l'instant
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setUploadedImages(prev => [...prev, imageUrl]);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Image ajoutée",
        description: "Votre image a été ajoutée au message",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'image",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          handleImageUpload(file);
        }
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Saisie vocale non supportée",
        description: "Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.",
        variant: "destructive",
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setMessage((prev) => (prev.endsWith(" ") || prev === "" ? prev : prev + " ") + transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        toast({
          title: "Erreur reconnaissance vocale",
          description: event.error === "no-speech" ? "Aucune parole détectée" : event.error,
          variant: "destructive",
        });
      }
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast({ title: "Écoute en cours...", description: "Parlez. Cliquez sur le micro pour arrêter." });
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isRecording) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const toggleVoice = () => {
    if (isRecording) stopVoiceInput();
    else startVoiceInput();
  };

  const handleSend = async () => {
    if ((!message.trim() && uploadedImages.length === 0) || loading) return;

    const userMessage = message.trim();
    const images = [...uploadedImages];
    setMessage("");
    setUploadedImages([]);
    setLoading(true);

    try {
      // Créer une conversation si nécessaire
      let conversationId = selectedConversationId;
      let isNewConversation = false;
      
      if (!conversationId) {
        // Créer un titre descriptif basé sur le premier message
        const conversationTitle = userMessage.length > 50 
          ? userMessage.substring(0, 47) + "..." 
          : userMessage || "Nouvelle conversation";
        
        const newConv = await createConversation.mutateAsync({
          title: conversationTitle,
          metadata: { type: "btp" }, // Marquer comme conversation BTP
        });
        conversationId = newConv.id;
        setSelectedConversationId(conversationId);
        isNewConversation = true;
        
        console.log("✅ Nouvelle conversation créée:", conversationId, "Titre:", conversationTitle);
      }

      // Compresser les images une seule fois (évite limites de taille Supabase + stockage)
      const imagesToUse = images.length > 0 ? await compressImagesForAI(images) : undefined;

      // Préparer le contenu du message avec les images
      const messageContent = userMessage + (images.length > 0 ? `\n[${images.length} image(s) attachée(s)]` : "");
      
      // Sauvegarder le message utilisateur
      await createMessage.mutateAsync({
        conversation_id: conversationId,
        content: messageContent,
        role: "user",
        images: imagesToUse,
      });
      
      console.log("✅ Message utilisateur sauvegardé dans conversation:", conversationId);

      // Préparer l'historique pour l'IA
      const history = messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Appeler l'IA avec le contexte de la page actuelle et les images (déjà compressées)
      console.log("🚀 Appel de l'IA avec:", {
        message: userMessage,
        conversationId,
        historyLength: history.length,
        imagesCount: imagesToUse?.length || 0,
      });

      let response;
      try {
        response = await callAIAssistant({
          message: userMessage,
          images: imagesToUse,
          history: history,
          conversationId: conversationId,
          currentPage: location.pathname,
          context: {
            timestamp: new Date().toISOString(),
          },
        });

        console.log("📥 Réponse reçue de l'IA:", response);
      } catch (callError: any) {
        console.error("❌ Erreur lors de l'appel à l'IA:", callError);
        throw new Error(`Erreur lors de l'appel à l'IA: ${callError.message || "Erreur inconnue"}`);
      }

      // Vérifier que la réponse existe
      if (!response) {
        console.error("❌ Réponse vide reçue");
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
        console.error("❌ Réponse IA vide ou invalide:", response);
        throw new Error("L'IA n'a pas généré de réponse valide. Veuillez réessayer.");
      }

      console.log("✅ Réponse IA extraite, longueur:", aiResponseText.length);

      // Afficher immédiatement la réponse dans l'interface
      setPendingResponse(aiResponseText);
      console.log("✅ Réponse IA affichée dans l'interface");

      // Sauvegarder la réponse de l'IA
      try {
        const savedMessage = await createMessage.mutateAsync({
          conversation_id: conversationId,
          content: aiResponseText,
          role: "assistant",
        });
        
        console.log("✅ Réponse IA sauvegardée dans conversation:", conversationId);
        
        // Mettre à jour immédiatement le cache React Query pour que le message soit visible
        queryClient.setQueryData(
          ["ai_messages", conversationId],
          (oldMessages: any[] = []) => [...oldMessages, savedMessage]
        );
        
        // Attendre un court instant pour que le composant se mette à jour
        // puis effacer pendingResponse une fois que le message est visible
        setTimeout(() => {
          setPendingResponse(null);
          console.log("✅ Message ajouté au cache, pendingResponse effacé");
        }, 100);
      } catch (saveError: any) {
        console.error("⚠️ Erreur lors de la sauvegarde de la réponse:", saveError);
        // Ne pas effacer la réponse en attente si la sauvegarde échoue
        // Elle restera visible dans l'interface
      }
      
      // Pas d'invalidateQueries : la mise à jour optimiste dans useCreateConversation
      // suffit. Un refetch écraserait la nouvelle conversation avec des données serveur
      // potentiellement incomplètes (propagation) et la ferait disparaître.
    } catch (error: any) {
      console.error("❌ Erreur lors de l'envoi du message:", error);
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
    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 h-[calc(100dvh-220px)] min-h-[400px] sm:h-[550px] sm:min-h-[500px]">
      {/* Sidebar - en bas sur mobile (flex-col-reverse), à gauche sur desktop */}
      <div className="w-full sm:w-64 flex-shrink-0">
        <ConversationsSidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>
      {/* Zone de chat - en haut sur mobile pour priorité à l'input visible */}
      <GlassCard className="flex-1 flex flex-col min-h-0 min-w-0 flex-[1_1_0]">
        <div className="p-3 sm:p-6 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg">Assistant IA</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Posez vos questions sur le BTP
              </p>
            </div>
            {selectedConversationId && (
              <Button
                variant="ghost"
                size="icon"
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
                className="shrink-0"
                title="Supprimer cette conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3 sm:p-6 min-h-0">
          <div className="space-y-4">
            {messages.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8 sm:py-12">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Commencez une conversation avec l'assistant IA</p>
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
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50"
                  }`}
                >
                  {/* Afficher les images si présentes */}
                  {msg.metadata?.images && msg.metadata.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.metadata.images.map((img: string, idx: number) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Image ${idx + 1}`}
                          className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg border border-border/20"
                        />
                      ))}
                    </div>
                  )}
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
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-border/50 rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-[80%]">
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

        {/* Input - padding bottom avec safe-area pour mobile */}
        <div className="p-3 sm:p-6 border-t border-border/50 space-y-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          {/* Images uploadées */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Upload ${index + 1}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border/50"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Barre d'input */}
          <div className="flex gap-1.5 sm:gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="shrink-0"
              title="Ajouter une image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVoice}
              disabled={loading}
              className="shrink-0"
              title={isRecording ? "Arrêter l'enregistrement" : "Parler au micro"}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
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
              onFocus={() => {
                inputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
              }}
              placeholder="Tapez votre message..."
              disabled={loading}
              className="flex-1 min-w-0 text-sm sm:text-base [touch-action:manipulation]"
              inputMode="text"
              autoComplete="off"
              enterKeyHint="send"
            />
            <Button 
              onClick={handleSend} 
              disabled={loading || (!message.trim() && uploadedImages.length === 0)}
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
      </GlassCard>
    </div>
  );
};

