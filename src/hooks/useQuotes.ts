import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_QUOTES } from "@/fakeData/quotes";

export interface Quote {
  id: string;
  user_id: string;
  client_name: string | null;
  surface: number | null;
  work_type: string | null;
  materials: string[] | null;
  image_urls: string[] | null;
  estimated_cost: number | null;
  details: any;
  status: string | null;
  signature_data: string | null;
  signed_at: string | null;
  signed_by: string | null;
  quote_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteFilters {
  status?: string;
  client_name?: string;
  date_from?: string;
  date_to?: string;
}

// Hook pour récupérer tous les devis
export const useQuotes = (filters?: QuoteFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quotes", user?.id, filters],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          let query = supabase
            .from("ai_quotes")
            .select("*")
            .eq("user_id", user.id)
            .order("quote_number", { ascending: false, nullsFirst: false ,
    throwOnError: false,
  })
            .order("created_at", { ascending: false });

          // Appliquer les filtres
          if (filters?.status) {
            query = query.eq("status", filters.status);
          }
          if (filters?.client_name) {
            query = query.ilike("client_name", `%${filters.client_name}%`);
          }
          if (filters?.date_from) {
            query = query.gte("created_at", filters.date_from);
          }
          if (filters?.date_to) {
            query = query.lte("created_at", filters.date_to);
          }

          const { data, error } = await query;

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            // Si fake data activé → retourne FAKE_QUOTES
            // Si fake data désactivé → retourne []
            throw error;
          }
          const quotes = (data || []) as Quote[];
          // Retourner les vraies données (même si vide)
          // queryWithTimeout gère le fallback automatiquement
          return quotes;
        },
        filters?.status 
          ? FAKE_QUOTES.filter(q => q.status === filters.status)
          : FAKE_QUOTES,
        "useQuotes"
      );
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

// Hook pour récupérer un devis par ID
export const useQuote = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quote", id, user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) throw new Error("User not authenticated or no ID provided");

          const { data, error } = await supabase
            .from("ai_quotes")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            throw error;
          }
          return data as Quote;
        },
        FAKE_QUOTES[0] || null,
        "useQuote"
      );
    },
    enabled: !!user && !!id,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

// Hook pour supprimer un devis
export const useDeleteQuote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("ai_quotes")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast({
        title: "Devis supprimé",
        description: "Le devis a été supprimé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le devis",
        variant: "destructive",
      });
    },
  });
};

// Hook pour mettre à jour le statut d'un devis
export const useUpdateQuoteStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("ai_quotes")
        .update({ status })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du devis a été mis à jour.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    },
  });
};

