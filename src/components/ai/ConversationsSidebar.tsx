import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBTPConversations, useCreateConversation, useDeleteConversation } from "@/hooks/useConversations";
import { useLastMessage } from "@/hooks/useLastMessage";
import { Plus, Search, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";

interface ConversationsSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export const ConversationsSidebar = ({
  selectedConversationId,
  onSelectConversation,
}: ConversationsSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { toast } = useToast();
  // Utiliser le hook spécialisé pour les conversations BTP uniquement
  const { data: conversations = [] } = useBTPConversations(false);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  // Filtrer et trier les conversations (plus récentes en premier)
  const filteredConversations = conversations
    .filter((conv) =>
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Trier par date de dernière mise à jour ou création
      const dateA = new Date(a.last_message_at || a.created_at).getTime();
      const dateB = new Date(b.last_message_at || b.created_at).getTime();
      return dateB - dateA; // Plus récent en premier
    });

  const handleNewConversation = async () => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const newConv = await createConversation.mutateAsync({
        title: `Conversation ${timeStr}`,
        metadata: { type: "btp" }, // Marquer comme conversation BTP
      });
      console.log("✅ Nouvelle conversation créée depuis sidebar:", newConv.id);
      onSelectConversation(newConv.id);
    } catch (error) {
      console.error("❌ Error creating conversation:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation.mutateAsync(id);
      // Si la conversation supprimée était sélectionnée, sélectionner la première conversation restante
      if (selectedConversationId === id) {
        const remainingConversations = filteredConversations.filter(c => c.id !== id);
        if (remainingConversations.length > 0) {
          onSelectConversation(remainingConversations[0].id);
        } else {
          onSelectConversation("");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      // Supprimer toutes les conversations une par une
      const deletePromises = filteredConversations.map(conv => 
        deleteConversation.mutateAsync(conv.id)
      );
      await Promise.all(deletePromises);
      
      toast({
        title: "✅ Conversations supprimées",
        description: `${filteredConversations.length} conversation(s) supprimée(s) avec succès`,
      });
      
      // Désélectionner la conversation actuelle
      onSelectConversation("");
      setShowDeleteAllDialog(false);
    } catch (error: any) {
      console.error("Erreur lors de la suppression de toutes les conversations:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer toutes les conversations",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <GlassCard className="flex flex-col h-full min-h-[500px] sm:min-h-0">
      <div className="p-4 border-b border-border/50 space-y-2">
        <Button
          onClick={handleNewConversation}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle conversation
        </Button>
        {filteredConversations.length > 0 && (
          <Button
            onClick={() => setShowDeleteAllDialog(true)}
            variant="outline"
            className="w-full"
            size="sm"
            disabled={isDeletingAll}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer toutes
          </Button>
        )}
      </div>

      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversationId === conv.id}
                onSelect={() => onSelectConversation(conv.id)}
                onDelete={(e) => handleDelete(conv.id, e)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialog de confirmation pour supprimer toutes les conversations */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les conversations</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer toutes les conversations ({filteredConversations.length}) ? 
              Cette action est irréversible et supprimera tous les messages associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeletingAll}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {isDeletingAll ? "Suppression..." : "Supprimer toutes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlassCard>
  );
};

interface ConversationItemProps {
  conversation: any;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const ConversationItem = ({
  conversation,
  isSelected,
  onSelect,
  onDelete,
}: ConversationItemProps) => {
  const { data: lastMessage } = useLastMessage(conversation.id);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-3 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-white/60 dark:hover:bg-gray-800/60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {conversation.title || "Sans titre"}
          </p>
          {lastMessage && (
            <p
              className={cn(
                "text-xs mt-1 truncate",
                isSelected
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              )}
            >
              {lastMessage.content?.substring(0, 50)}
              {lastMessage.content && lastMessage.content.length > 50 && "..."}
            </p>
          )}
          <p
            className={cn(
              "text-xs mt-1",
              isSelected
                ? "text-primary-foreground/60"
                : "text-muted-foreground"
            )}
          >
            {formatDistanceToNow(new Date(conversation.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

