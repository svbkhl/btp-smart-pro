import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_PROJECTS } from "@/fakeData/projects";
import type { Project } from "@/fakeData/projects";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

export interface CreateProjectData {
  name: string;
  client_id?: string;
  status?: "planifié" | "en_attente" | "en_cours" | "terminé" | "annulé";
  progress?: number;
  budget?: number;
  costs?: number;
  actual_revenue?: number;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  image_url?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

// Hook pour récupérer tous les projets
export const useProjects = () => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();

  return useQuery({
    queryKey: ["projects", user?.id, fakeDataEnabled],
    queryFn: async () => {
      // Si fake data est activé, retourner directement les fake data
      if (fakeDataEnabled) {
        console.log("🎭 Mode démo activé - Retour des fake projects");
        return FAKE_PROJECTS;
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
            .from("projects")
            .select("*, client:clients(id, name, email)")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error) throw error;
          return data as Project[];
        },
        [],
        "useProjects"
      );
    },
    enabled: !!user || fakeDataEnabled,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: 60000, // Polling automatique toutes les 60s
  });
};

// Hook pour récupérer un projet par ID
export const useProject = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project", id, user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) throw new Error("User not authenticated or no ID provided");

          // Récupérer company_id pour vérification
          const companyId = await getCurrentCompanyId(user.id);
          if (!companyId) {
            throw new Error("User is not a member of any company");
          }

          const { data, error } = await supabase
            .from("projects")
            .select("*, client:clients(id, name, email)")
            .eq("id", id)
            .eq("company_id", companyId)
            .maybeSingle();

          if (!data) {
            throw new Error("Project not found");
          }

          if (error) throw error;
          return data as Project;
        },
        FAKE_PROJECTS[0] || null,
        "useProject"
      );
    },
    enabled: !!user && !!id,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });
};

// Hook pour créer un projet
export const useCreateProject = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      if (!user) throw new Error("User not authenticated");

      // Récupérer company_id
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise pour créer un projet");
      }

      // Construire l'objet d'insertion en excluant les champs undefined
      const insertData: any = {
        user_id: user.id,
        company_id: companyId,
        name: projectData.name,
        status: projectData.status || "planifié",
        progress: projectData.progress || 0,
      };

      // Ajouter les champs optionnels seulement s'ils sont définis
      if (projectData.client_id) insertData.client_id = projectData.client_id;
      if (projectData.budget !== undefined) insertData.budget = projectData.budget;
      if (projectData.costs !== undefined) insertData.costs = projectData.costs;
      if (projectData.actual_revenue !== undefined) insertData.actual_revenue = projectData.actual_revenue;
      if (projectData.location) insertData.location = projectData.location;
      if (projectData.start_date) insertData.start_date = projectData.start_date;
      if (projectData.end_date) insertData.end_date = projectData.end_date;
      if (projectData.description) insertData.description = projectData.description;
      if (projectData.image_url) insertData.image_url = projectData.image_url;

      const { data, error } = await supabase
        .from("projects")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Projet créé",
        description: "Le projet a été créé avec succès.",
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

// Hook pour mettre à jour un projet
export const useUpdateProject = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...projectData }: UpdateProjectData) => {
      if (!user) throw new Error("User not authenticated");

      // Récupérer company_id pour vérification
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise");
      }

      // Construire l'objet de mise à jour en excluant les champs undefined
      const updateData: any = {};
      
      if (projectData.name !== undefined) updateData.name = projectData.name;
      if (projectData.client_id !== undefined) updateData.client_id = projectData.client_id;
      if (projectData.status !== undefined) updateData.status = projectData.status;
      if (projectData.progress !== undefined) updateData.progress = projectData.progress;
      if (projectData.budget !== undefined) updateData.budget = projectData.budget;
      if (projectData.costs !== undefined) updateData.costs = projectData.costs;
      if (projectData.actual_revenue !== undefined) updateData.actual_revenue = projectData.actual_revenue;
      if (projectData.location !== undefined) updateData.location = projectData.location;
      if (projectData.start_date !== undefined) updateData.start_date = projectData.start_date;
      if (projectData.end_date !== undefined) updateData.end_date = projectData.end_date;
      if (projectData.description !== undefined) updateData.description = projectData.description;
      if (projectData.image_url !== undefined) updateData.image_url = projectData.image_url;

      const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast({
        title: "Projet mis à jour",
        description: "Le projet a été mis à jour avec succès.",
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

// Hook pour supprimer un projet
export const useDeleteProject = () => {
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
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Projet supprimé",
        description: "Le projet a été supprimé avec succès.",
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



