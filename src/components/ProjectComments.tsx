import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_email?: string;
}

interface ProjectCommentsProps {
  projectId: string;
}

export const ProjectComments = ({ projectId }: ProjectCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const loadComments = async () => {
      if (!projectId) return;
      setLoadingComments(true);
      try {
        const { data, error } = await supabase
          .from("project_comments")
          .select("id, project_id, user_id, content, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setComments((data || []) as Comment[]);
      } catch (error: any) {
        console.warn("Impossible de charger les commentaires projet:", error?.message || error);
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    };

    loadComments();
  }, [projectId]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) {
      toast({
        title: "Commentaire vide",
        description: "Veuillez saisir un commentaire",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Utiliser first_name/last_name (format standard) avec fallback sur prenom/nom (ancien format)
      const firstName = user.user_metadata?.first_name || user.user_metadata?.prenom;
      const lastName = user.user_metadata?.last_name || user.user_metadata?.nom;
      const displayName = firstName && lastName
        ? `${firstName} ${lastName}`
        : user.email?.split("@")[0] || "Utilisateur";
      
      const { data, error } = await supabase
        .from("project_comments")
        .insert({
          project_id: projectId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select("id, project_id, user_id, content, created_at")
        .single();

      if (error) throw error;

      const comment: Comment = {
        ...(data as Comment),
        author_name: displayName,
        author_email: user.email || "",
      };

      setComments((prev) => [comment, ...prev]);
      setNewComment("");

      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été ajouté avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le commentaire",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = (email?: string, name?: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Commentaires
      </h3>

      {/* Formulaire d'ajout */}
      {user && (
        <div className="mb-6 space-y-3">
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? "Envoi..." : "Publier"}
            </Button>
          </div>
        </div>
      )}

      {/* Liste des commentaires */}
      <div className="space-y-4">
        {loadingComments ? (
          <p className="text-muted-foreground text-center py-8">Chargement des commentaires...</p>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun commentaire pour le moment
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials(comment.author_email, comment.author_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {comment.author_name || "Utilisateur"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "d MMM yyyy à HH:mm", {
                      locale: fr,
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
};




















