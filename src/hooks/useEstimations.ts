import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

export interface AIEstimation {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  estimation_result: string;
  images_count: number;
  created_at: string;
}

export interface CreateEstimationData {
  title: string;
  description?: string | null;
  estimation_result: string;
  images_count?: number;
}

export const useEstimations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["ai_estimations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("ai_estimations")
        .select("id, user_id, title, description, estimation_result, images_count, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
          return [];
        }
        throw error;
      }
      return (data || []) as AIEstimation[];
    },
    enabled: !!user,
    staleTime: 30000,
  });
};

export const useCreateEstimation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateEstimationData) => {
      if (!user) throw new Error("User not authenticated");

      const { data: estimation, error } = await supabase
        .from("ai_estimations")
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description ?? null,
          estimation_result: data.estimation_result,
          images_count: data.images_count ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return estimation as AIEstimation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_estimations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder l'estimation",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteEstimation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("ai_estimations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_estimations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'estimation",
        variant: "destructive",
      });
    },
  });
};
