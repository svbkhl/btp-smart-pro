import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_CLIENTS } from "@/fakeData/clients";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  status: "actif" | "terminé" | "planifié" | "VIP";
  total_spent?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  status?: "actif" | "terminé" | "planifié" | "VIP";
}

export interface UpdateClientData extends Partial<CreateClientData> {
  id: string;
}

// Hook pour récupérer tous les clients
export const useClients = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) {
            // Si erreur et fake data activé, retourner fake data
            // Sinon, lancer l'erreur pour que React Query gère l'état d'erreur
            const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
            if (isFakeDataEnabled()) {
              return FAKE_CLIENTS;
            }
            throw error;
          }
          // Si pas de données et fake data activé, retourner fake data
          // Sinon, retourner un tableau vide
          if (!data || data.length === 0) {
            const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
            if (isFakeDataEnabled()) {
              return FAKE_CLIENTS;
            }
            return [];
          }
          return data as Client[];
        },
        FAKE_CLIENTS,
        "useClients"
      );
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });
};

// Hook pour récupérer un client par ID
export const useClient = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client", id, user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) throw new Error("User not authenticated or no ID provided");

          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            throw error;
          }
          return data as Client;
        },
        FAKE_CLIENTS[0] || null,
        "useClient"
      );
    },
    enabled: !!user && !!id,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

// Hook pour créer un client
export const useCreateClient = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientData: CreateClientData) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("clients")
        .insert({
          ...clientData,
          user_id: user.id,
          status: clientData.status || "actif",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Client créé",
        description: "Le client a été créé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook pour mettre à jour un client
export const useUpdateClient = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...clientData }: UpdateClientData) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast({
        title: "Client mis à jour",
        description: "Le client a été mis à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer un client
export const useDeleteClient = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Client supprimé",
        description: "Le client a été supprimé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

