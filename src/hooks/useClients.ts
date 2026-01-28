import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_CLIENTS } from "@/fakeData/clients";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useCompanyId } from "./useCompanyId";
import { logger } from "@/utils/logger";
import {
  handleSupabaseError,
  showErrorToast,
  createValidationError,
  createPermissionError,
  createNotFoundError,
} from "@/utils/errors";
import {
  validateDataIsolation,
  verifyBeforeDelete,
  isValidUUID,
} from "@/utils/securityChecks";

export interface Client {
  id: string;
  user_id: string;
  titre?: "M." | "Mme";
  name: string;
  prenom?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  status: "actif" | "terminé" | "planifié";
  total_spent?: number;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  titre?: "M." | "Mme";
  name: string;
  prenom?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  status?: "actif" | "terminé" | "planifié";
}

export const getClientFullName = (client: Client | Pick<Client, "titre" | "name" | "prenom">): string => {
  const parts: string[] = [];
  if (client.titre) parts.push(client.titre);
  if (client.prenom) parts.push(client.prenom);
  parts.push(client.name);
  return parts.join(" ");
};

export interface UpdateClientData extends Partial<CreateClientData> {
  id: string;
}

/**
 * Hook pour récupérer tous les clients de l'entreprise
 * 
 * OPTIMISATIONS REACT QUERY:
 * - queryKey simplifiée: ["clients", companyId]
 * - staleTime: 5 minutes (données considérées fraîches pendant 5 min)
 * - refetchInterval: false (pas de polling automatique)
 * - useCompanyId hook réutilisé (cache partagé avec tous les autres hooks)
 * 
 * SÉCURITÉ:
 * - Filtre par company_id dans la requête
 * - validateDataIsolation() pour double protection
 */
export const useClients = () => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["clients", companyId],
    queryFn: async () => {
      if (fakeDataEnabled) {
        return FAKE_CLIENTS;
      }

      return queryWithTimeout(
        async () => {
          if (!user) {
            throw createValidationError(
              "Vous devez être connecté pour accéder aux clients.",
              "User not authenticated"
            );
          }

          if (!companyId) {
            logger.warn("User is not a member of any company", { userId: user.id });
            return [];
          }

          const { data, error } = await supabase
            .from("clients")
            .select("id, name, prenom, titre, email, phone, location, avatar_url, status, total_spent, company_id, user_id, created_at, updated_at")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error) {
            throw handleSupabaseError(error, "la récupération des clients");
          }
          
          const safeData = validateDataIsolation(
            data || [], 
            companyId, 
            "useClients query"
          );
          
          return safeData as Client[];
        },
        [],
        "useClients"
      );
    },
    enabled: !!user && !isLoadingCompanyId && (!!companyId || fakeDataEnabled),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - données fraîches pendant 5 min
    gcTime: 10 * 60 * 1000, // 10 minutes - garde en mémoire 10 min après non-utilisation
    refetchInterval: false, // Pas de polling automatique
    refetchOnWindowFocus: true, // Rafraîchir quand l'utilisateur revient sur l'onglet
    throwOnError: false,
  });
};

/**
 * Hook pour récupérer un client par ID
 * 
 * OPTIMISATIONS REACT QUERY:
 * - queryKey simplifiée: ["client", id, companyId]
 * - Cache partagé avec useClients (si le client existe dans la liste)
 * - staleTime: 5 minutes
 */
export const useClient = (id: string | undefined) => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["client", id, companyId],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) {
            throw createValidationError(
              "Données manquantes pour récupérer le client.",
              "User not authenticated or no ID provided"
            );
          }

          if (fakeDataEnabled) {
            return FAKE_CLIENTS.find(c => c.id === id) || FAKE_CLIENTS[0] || null;
          }

          if (!companyId) {
            throw createPermissionError(
              "Vous devez être membre d'une entreprise pour accéder à ce client.",
              "No company_id found for user"
            );
          }

          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("id", id)
            .eq("company_id", companyId)
            .maybeSingle();

          if (error) {
            throw handleSupabaseError(error, "la récupération du client");
          }
          
          if (!data) {
            throw createNotFoundError("Client");
          }
          
          return data as Client;
        },
        FAKE_CLIENTS[0] || null,
        "useClient"
      );
    },
    enabled: !!user && !!id && !isLoadingCompanyId && (!!companyId || fakeDataEnabled),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    throwOnError: false,
  });
};

/**
 * Hook pour créer un client
 * 
 * OPTIMISATIONS REACT QUERY:
 * - Optimistic update: ajoute le client immédiatement dans le cache
 * - Rollback automatique si la mutation échoue
 * - setQueryData pour mise à jour instantanée de l'UI
 */
export const useCreateClient = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientData: CreateClientData) => {
      if (!user) {
        throw createValidationError(
          "Vous devez être connecté pour créer un client.",
          "User not authenticated"
        );
      }

      const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
      if (isFakeDataEnabled()) {
        const fakeClient: Client = {
          id: `fake-client-${Date.now()}`,
          user_id: user.id,
          titre: clientData.titre,
          name: clientData.name,
          prenom: clientData.prenom,
          email: clientData.email,
          phone: clientData.phone,
          location: clientData.location,
          avatar_url: clientData.avatar_url,
          status: clientData.status || "actif",
          total_spent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return fakeClient;
      }

      if (!user.id || !isValidUUID(user.id)) {
        throw createValidationError(
          "Session invalide. Veuillez vous reconnecter.",
          `Invalid user ID: ${user.id}`
        );
      }

      if (!companyId) {
        throw createPermissionError(
          "Vous devez être membre d'une entreprise pour créer un client.",
          "No company_id found for user"
        );
      }

      if (!clientData.name || clientData.name.trim().length === 0) {
        throw createValidationError("Le nom du client est obligatoire.");
      }

      const cleanInsertData: {
        user_id: string;
        name: string;
        status: string;
        titre?: string;
        prenom?: string;
        email?: string;
        phone?: string;
        location?: string;
        avatar_url?: string;
      } = {
        user_id: user.id,
        name: clientData.name.trim(),
        status: clientData.status || "actif",
      };
      
      if (clientData.titre) cleanInsertData.titre = clientData.titre;
      if (clientData.prenom?.trim()) cleanInsertData.prenom = clientData.prenom.trim();
      if (clientData.email?.trim()) cleanInsertData.email = clientData.email.trim();
      if (clientData.phone?.trim()) cleanInsertData.phone = clientData.phone.trim();
      if (clientData.location?.trim()) cleanInsertData.location = clientData.location.trim();
      if (clientData.avatar_url?.trim()) cleanInsertData.avatar_url = clientData.avatar_url.trim();

      const { data, error } = await supabase
        .from("clients")
        .insert(cleanInsertData)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error, "la création du client");
      }
      
      if (!data?.company_id) {
        logger.security("Client created without company_id", { 
          clientId: data?.id, 
          expectedCompanyId: companyId 
        });
        throw createPermissionError(
          "Le client a été créé sans entreprise associée. Veuillez contacter le support.",
          "Client created without company_id - trigger may not be working"
        );
      }
      
      if (data.company_id !== companyId) {
        logger.warn("Company_id mismatch after creation", {
          clientCompanyId: data.company_id,
          expectedCompanyId: companyId
        });
      }
      
      return data as Client;
    },
    
    // OPTIMISTIC UPDATE: Ajouter le client immédiatement dans le cache
    onMutate: async (newClientData) => {
      if (!companyId) return;

      // Annuler les requêtes en cours pour éviter les conflits
      await queryClient.cancelQueries({ queryKey: ["clients", companyId] });

      // Sauvegarder l'état actuel pour rollback
      const previousClients = queryClient.getQueryData<Client[]>(["clients", companyId]);

      // Créer un client temporaire pour l'UI
      const optimisticClient: Client = {
        id: `temp-${Date.now()}`, // ID temporaire
        user_id: user?.id || "",
        titre: newClientData.titre,
        name: newClientData.name,
        prenom: newClientData.prenom,
        email: newClientData.email,
        phone: newClientData.phone,
        location: newClientData.location,
        avatar_url: newClientData.avatar_url,
        status: newClientData.status || "actif",
        total_spent: 0,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Ajouter le client optimiste dans le cache
      queryClient.setQueryData<Client[]>(
        ["clients", companyId],
        (old) => [optimisticClient, ...(old || [])]
      );

      logger.debug("Optimistic update applied", { clientName: newClientData.name });

      // Retourner le contexte pour rollback si nécessaire
      return { previousClients };
    },

    onSuccess: (newClient) => {
      if (!companyId) return;

      // Remplacer le client optimiste par le vrai client du serveur
      queryClient.setQueryData<Client[]>(
        ["clients", companyId],
        (old) => {
          if (!old) return [newClient];
          // Remplacer le client temporaire par le vrai
          return old.map(client => 
            client.id.startsWith('temp-') ? newClient : client
          );
        }
      );

      logger.debug("Optimistic update confirmed", { clientId: newClient.id });

      toast({
        title: "Client créé",
        description: "Le client a été créé avec succès.",
      });
    },

    onError: (error: unknown, _newClientData, context) => {
      if (!companyId) return;

      // ROLLBACK: Restaurer l'état précédent en cas d'erreur
      if (context?.previousClients) {
        queryClient.setQueryData(["clients", companyId], context.previousClients);
        logger.debug("Optimistic update rolled back");
      }

      showErrorToast(error, toast);
    },

    // Toujours refetch après succès pour être sûr d'avoir les bonnes données
    onSettled: () => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["clients", companyId] });
      }
    },
  });
};

/**
 * Hook pour mettre à jour un client
 * 
 * OPTIMISATIONS REACT QUERY:
 * - Optimistic update: met à jour le client immédiatement dans le cache
 * - Rollback automatique si la mutation échoue
 */
export const useUpdateClient = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...clientData }: UpdateClientData) => {
      if (!user) {
        throw createValidationError(
          "Vous devez être connecté pour modifier un client.",
          "User not authenticated"
        );
      }

      if (!companyId) {
        throw createPermissionError(
          "Vous devez être membre d'une entreprise pour modifier ce client.",
          "No company_id found for user"
        );
      }

      if (!id) {
        throw createValidationError("L'identifiant du client est manquant.");
      }

      const { data, error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error, "la modification du client");
      }

      if (!data) {
        throw createNotFoundError("Client");
      }

      return data as Client;
    },

    // OPTIMISTIC UPDATE: Modifier le client immédiatement
    onMutate: async ({ id, ...updates }) => {
      if (!companyId) return;

      await queryClient.cancelQueries({ queryKey: ["clients", companyId] });
      await queryClient.cancelQueries({ queryKey: ["client", id, companyId] });

      const previousClients = queryClient.getQueryData<Client[]>(["clients", companyId]);
      const previousClient = queryClient.getQueryData<Client>(["client", id, companyId]);

      // Mettre à jour dans la liste
      queryClient.setQueryData<Client[]>(
        ["clients", companyId],
        (old) => old?.map(client => 
          client.id === id 
            ? { ...client, ...updates, updated_at: new Date().toISOString() }
            : client
        )
      );

      // Mettre à jour le client individuel
      if (previousClient) {
        queryClient.setQueryData<Client>(
          ["client", id, companyId],
          { ...previousClient, ...updates, updated_at: new Date().toISOString() }
        );
      }

      logger.debug("Optimistic update applied", { clientId: id });

      return { previousClients, previousClient };
    },

    onSuccess: (updatedClient) => {
      if (!companyId) return;

      // Confirmer avec les vraies données du serveur
      queryClient.setQueryData<Client[]>(
        ["clients", companyId],
        (old) => old?.map(client => client.id === updatedClient.id ? updatedClient : client)
      );

      queryClient.setQueryData<Client>(
        ["client", updatedClient.id, companyId],
        updatedClient
      );

      logger.debug("Optimistic update confirmed", { clientId: updatedClient.id });

      toast({
        title: "Client mis à jour",
        description: "Le client a été mis à jour avec succès.",
      });
    },

    onError: (error: unknown, { id }, context) => {
      if (!companyId) return;

      // ROLLBACK
      if (context?.previousClients) {
        queryClient.setQueryData(["clients", companyId], context.previousClients);
      }
      if (context?.previousClient) {
        queryClient.setQueryData(["client", id, companyId], context.previousClient);
      }

      logger.debug("Optimistic update rolled back", { clientId: id });
      showErrorToast(error, toast);
    },

    onSettled: (_data, _error, { id }) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["clients", companyId] });
        queryClient.invalidateQueries({ queryKey: ["client", id, companyId] });
      }
    },
  });
};

/**
 * Hook pour supprimer un client
 * 
 * OPTIMISATIONS REACT QUERY:
 * - Optimistic update: supprime le client immédiatement du cache
 * - Rollback automatique si la mutation échoue
 */
export const useDeleteClient = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw createValidationError(
          "Vous devez être connecté pour supprimer un client.",
          "User not authenticated"
        );
      }

      if (!companyId) {
        throw createPermissionError(
          "Vous devez être membre d'une entreprise pour supprimer ce client.",
          "No company_id found for user"
        );
      }

      if (!id) {
        throw createValidationError("L'identifiant du client est manquant.");
      }

      // Vérifications de sécurité complètes
      await verifyBeforeDelete("clients", id, companyId);

      const { error, data } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId)
        .select();

      if (error) {
        throw handleSupabaseError(error, "la suppression du client");
      }

      if (data && data.length !== 1) {
        logger.security("Unexpected delete count", {
          expected: 1,
          actual: data?.length || 0,
          clientId: id,
        });
        throw createPermissionError(
          "La suppression du client a échoué. Veuillez réessayer.",
          `Expected 1 deleted client, got ${data?.length || 0}`
        );
      }

      return id;
    },

    // OPTIMISTIC UPDATE: Supprimer le client immédiatement
    onMutate: async (id) => {
      if (!companyId) return;

      await queryClient.cancelQueries({ queryKey: ["clients", companyId] });
      await queryClient.cancelQueries({ queryKey: ["client", id, companyId] });

      const previousClients = queryClient.getQueryData<Client[]>(["clients", companyId]);
      const previousClient = queryClient.getQueryData<Client>(["client", id, companyId]);

      // Supprimer de la liste
      queryClient.setQueryData<Client[]>(
        ["clients", companyId],
        (old) => old?.filter(client => client.id !== id)
      );

      // Supprimer le client individuel
      queryClient.removeQueries({ queryKey: ["client", id, companyId] });

      logger.debug("Optimistic delete applied", { clientId: id });

      return { previousClients, previousClient, deletedId: id };
    },

    onSuccess: () => {
      toast({
        title: "Client supprimé",
        description: "Le client a été supprimé avec succès.",
      });
    },

    onError: (error: unknown, id, context) => {
      if (!companyId) return;

      // ROLLBACK: Restaurer le client supprimé
      if (context?.previousClients) {
        queryClient.setQueryData(["clients", companyId], context.previousClients);
      }
      if (context?.previousClient) {
        queryClient.setQueryData(["client", id, companyId], context.previousClient);
      }

      logger.debug("Optimistic delete rolled back", { clientId: id });
      showErrorToast(error, toast);
    },

    onSettled: (_data, _error, id) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["clients", companyId] });
        queryClient.invalidateQueries({ queryKey: ["client", id, companyId] });
      }
    },
  });
};
