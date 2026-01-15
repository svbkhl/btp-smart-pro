import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_CLIENTS } from "@/fakeData/clients";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

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
  const { fakeDataEnabled } = useFakeDataStore();

  return useQuery({
    queryKey: ["clients", user?.id, fakeDataEnabled],
    queryFn: async () => {
      // Si fake data est activé, retourner directement les fake data
      if (fakeDataEnabled) {
        console.log("🎭 Mode démo activé - Retour des fake clients");
        return FAKE_CLIENTS;
      }

      // Sinon, faire la vraie requête
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          // Récupérer company_id pour filtrage multi-tenant
          const companyId = await getCurrentCompanyId(user.id);
          if (!companyId) {
            console.warn("User is not a member of any company");
            return [];
          }

          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error) {
            // Gérer les erreurs 404 (table n'existe pas ou RLS bloque)
            if (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
              console.warn('Table clients non accessible. Vérifiez que la table existe et que les RLS policies sont configurées.');
              return [];
            }
            throw error;
          }
          return (data || []) as Client[];
        },
        [],
        "useClients"
      );
    },
    enabled: !!user || fakeDataEnabled,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: 60000, // Polling automatique toutes les 60s
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

          // Récupérer company_id de l'utilisateur
          const companyId = await getCurrentCompanyId(user.id);
          if (!companyId) {
            throw new Error("User is not a member of any company");
          }

          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("id", id)
            .eq("company_id", companyId)
            .maybeSingle();

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            throw error;
          }
          
          if (!data) {
            throw new Error("Client not found");
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

      // Vérifier si le mode fake data est activé
      const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
      if (isFakeDataEnabled()) {
        // En mode fake data, créer un faux client
        const fakeClient: Client = {
          id: `fake-client-${Date.now()}`,
          user_id: user.id,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          location: clientData.location,
          avatar_url: clientData.avatar_url,
          status: clientData.status || "actif",
          total_spent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log("Created fake client:", fakeClient);
        return fakeClient;
      }

      console.log("Creating client with data:", clientData);
      console.log("User ID:", user.id);
      console.log("User ID type:", typeof user.id);
      console.log("User ID is valid UUID:", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id));

      // Vérifier que user_id est bien un UUID valide
      if (!user.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
        throw new Error(`User ID invalide: ${user.id}`);
      }

      // Récupérer company_id
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise pour créer un client");
      }

      // Construire l'objet d'insertion de manière explicite avec seulement les champs nécessaires
      const insertData: {
        user_id: string;
        company_id: string;
        name: string;
        status: string;
        email?: string;
        phone?: string;
        location?: string;
        avatar_url?: string;
      } = {
        user_id: user.id,
        company_id: companyId,
        name: clientData.name.trim(),
        status: clientData.status || "actif",
      };

      // Ajouter les champs optionnels seulement s'ils sont définis et non vides
      if (clientData.email?.trim()) {
        insertData.email = clientData.email.trim();
      }
      if (clientData.phone?.trim()) {
        insertData.phone = clientData.phone.trim();
      }
      if (clientData.location?.trim()) {
        insertData.location = clientData.location.trim();
      }
      if (clientData.avatar_url?.trim()) {
        insertData.avatar_url = clientData.avatar_url.trim();
      }

      console.log("Inserting into Supabase:", JSON.stringify(insertData, null, 2));
      console.log("Insert data keys:", Object.keys(insertData));
      console.log("Insert data values:", Object.values(insertData));

      // S'assurer que les champs optionnels NULL ne sont pas envoyés si vides
      // Cela évite les problèmes avec les triggers de validation qui vérifient email/phone
      const cleanInsertData: {
        user_id: string;
        company_id: string;
        name: string;
        status: string;
        email?: string;
        phone?: string;
        location?: string;
        avatar_url?: string;
      } = {
        user_id: user.id,
        company_id: insertData.company_id,
        name: insertData.name,
        status: insertData.status,
      };

      // Ajouter seulement les champs non vides (les triggers de validation peuvent échouer si on envoie des chaînes vides)
      if (insertData.email && insertData.email.trim().length > 0) {
        cleanInsertData.email = insertData.email.trim();
      }
      if (insertData.phone && insertData.phone.trim().length > 0) {
        cleanInsertData.phone = insertData.phone.trim();
      }
      if (insertData.location && insertData.location.trim().length > 0) {
        cleanInsertData.location = insertData.location.trim();
      }
      if (insertData.avatar_url && insertData.avatar_url.trim().length > 0) {
        cleanInsertData.avatar_url = insertData.avatar_url.trim();
      }

      console.log("Clean insert data:", JSON.stringify(cleanInsertData, null, 2));

      // Essayer l'insertion
      const { data, error } = await supabase
        .from("clients")
        .insert(cleanInsertData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        console.error("Full error details:", JSON.stringify(error, null, 2));
        console.error("Error code:", error.code);
        console.error("Error hint:", error.hint);
        
        // Si l'erreur mentionne "clients" comme UUID, c'est probablement un problème de trigger
        if (error.message?.includes('invalid input syntax for type uuid: "clients"')) {
          console.error("⚠️ Erreur causée par un trigger. Le trigger notify_on_client_created essaie probablement d'utiliser 'clients' comme UUID.");
          console.error("💡 Solution: Exécutez le script SQL: supabase/FIX-CLIENTS-INSERT-TRIGGER.sql dans Supabase Dashboard > SQL Editor");
          throw new Error("Erreur lors de la création du client. Le trigger de notification est mal configuré. Veuillez exécuter le script de correction SQL.");
        }
        
        throw new Error(error.message || "Impossible de créer le client");
      }
      
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
      console.error("Create client error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le client",
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

      // Récupérer company_id pour vérification
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise");
      }

      const { data, error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", id)
        .eq("company_id", companyId)
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

      // Récupérer company_id pour vérification
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise");
      }

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

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

