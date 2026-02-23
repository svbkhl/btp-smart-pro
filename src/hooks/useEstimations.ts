import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { safeLocalStorage } from "@/utils/isBrowser";

const ESTIMATIONS_CACHE_KEY = "ai_estimations_cache";
// Pas d'expiration - les estimations restent pour toujours (comme les conversations)
const CACHE_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1 an

export interface AIEstimation {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  estimation_result: string;
  images_count: number;
  created_at: string;
}

const getCachedEstimations = (userId: string): AIEstimation[] | null => {
  try {
    const cached = safeLocalStorage.getItem(`${ESTIMATIONS_CACHE_KEY}_${userId}`);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    // Ne jamais supprimer - mettre à jour le timestamp pour prolonger la validité
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      safeLocalStorage.setItem(
        `${ESTIMATIONS_CACHE_KEY}_${userId}`,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    }
    return data;
  } catch {
    return null;
  }
};

const setCachedEstimations = (userId: string, estimations: AIEstimation[]) => {
  try {
    safeLocalStorage.setItem(
      `${ESTIMATIONS_CACHE_KEY}_${userId}`,
      JSON.stringify({ data: estimations, timestamp: Date.now() })
    );
  } catch {
    /* ignore */
  }
};

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
    initialData: user ? (getCachedEstimations(user.id) ?? undefined) : undefined,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("ai_estimations")
        .select("id, user_id, title, description, estimation_result, images_count, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
          const cached = getCachedEstimations(user.id);
          if (cached?.length) return cached;
          return [];
        }
        const cached = getCachedEstimations(user.id);
        if (cached?.length) return cached;
        throw error;
      }
      const estimations = (data || []) as AIEstimation[];
      if (estimations.length > 0) {
        setCachedEstimations(user.id, estimations);
        return estimations;
      }
      // Si le serveur renvoie vide (RLS, etc.) mais qu'on a du cache, garder le cache
      const cached = getCachedEstimations(user.id);
      if (cached?.length) return cached;
      setCachedEstimations(user.id, []);
      return [];
    },
    enabled: !!user,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000, // 5 minutes - garder en mémoire
  });
};

export const useCreateEstimation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateEstimationData) => {
      if (!user) throw new Error("User not authenticated");

      let result: AIEstimation;
      try {
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
        result = estimation as AIEstimation;
      } catch (err: any) {
        // Toute erreur (404, RLS, table inexistante...) : sauvegarder localement pour que l'estimation apparaisse dans la liste
        console.warn("ai_estimations non accessible, création locale:", err?.message || err);
        result = {
          id: `local-${Date.now()}`,
          user_id: user.id,
          title: data.title,
          description: data.description ?? null,
          estimation_result: data.estimation_result,
          images_count: data.images_count ?? 0,
          created_at: new Date().toISOString(),
        };
      }
      return result;
    },
    onSuccess: (estimation) => {
      if (user) {
        const newList = (old: AIEstimation[] = []) => {
          if (old.some((e) => e.id === estimation.id)) return old;
          return [estimation, ...old];
        };
        queryClient.setQueryData<AIEstimation[]>(["ai_estimations", user.id], newList);
        const list = queryClient.getQueryData<AIEstimation[]>(["ai_estimations", user.id]);
        if (list) setCachedEstimations(user.id, list);
      }
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

const isLocalEstimationId = (id: string) => id.startsWith("local-");

export const useUpdateEstimation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, estimation_result }: { id: string; estimation_result: string }) => {
      if (!user) throw new Error("User not authenticated");

      if (isLocalEstimationId(id)) {
        const list = queryClient.getQueryData<AIEstimation[]>(["ai_estimations", user.id]) || [];
        const updated = list.map((e) => (e.id === id ? { ...e, estimation_result } : e));
        const estimation = updated.find((e) => e.id === id);
        if (estimation) {
          setCachedEstimations(user.id, updated);
          return estimation;
        }
        throw new Error("Estimation non trouvée");
      }

      const { data, error } = await supabase
        .from("ai_estimations")
        .update({ estimation_result })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        // Table inexistante : mettre à jour le cache local pour que le suivi soit visible
        if (error.code === "PGRST116" || (error as any).status === 404 || error.message?.includes("does not exist")) {
          const list = queryClient.getQueryData<AIEstimation[]>(["ai_estimations", user.id]) || [];
          const updated = list.map((e) => (e.id === id ? { ...e, estimation_result } : e));
          const estimation = updated.find((e) => e.id === id);
          if (estimation) {
            queryClient.setQueryData(["ai_estimations", user.id], updated);
            setCachedEstimations(user.id, updated);
            return estimation;
          }
        }
        throw error;
      }
      return data as AIEstimation;
    },
    onSuccess: (estimation) => {
      if (user) {
        queryClient.setQueryData<AIEstimation[]>(
          ["ai_estimations", user.id],
          (old = []) =>
            old.map((e) => (e.id === estimation.id ? estimation : e))
        );
        const list = queryClient.getQueryData<AIEstimation[]>(["ai_estimations", user.id]);
        if (list) setCachedEstimations(user.id, list);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour l'estimation",
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

      if (isLocalEstimationId(id)) {
        const list = queryClient.getQueryData<AIEstimation[]>(["ai_estimations", user.id]) || [];
        const updated = list.filter((e) => e.id !== id);
        setCachedEstimations(user.id, updated);
        return id;
      }

      const { error } = await supabase
        .from("ai_estimations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "PGRST116" || (error as any).status === 404 || error.message?.includes("does not exist")) {
          const list = queryClient.getQueryData<AIEstimation[]>(["ai_estimations", user.id]) || [];
          const updated = list.filter((e) => e.id !== id);
          queryClient.setQueryData(["ai_estimations", user.id], updated);
          setCachedEstimations(user.id, updated);
          return id;
        }
        throw error;
      }
      return id;
    },
    onSuccess: (id) => {
      if (user) {
        queryClient.setQueryData<AIEstimation[]>(
          ["ai_estimations", user.id],
          (old = []) => old.filter((e) => e.id !== id)
        );
        const list = queryClient.getQueryData<AIEstimation[]>(["ai_estimations", user.id]);
        if (list) setCachedEstimations(user.id, list);
      }
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
