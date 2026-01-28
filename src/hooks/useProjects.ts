import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_PROJECTS } from "@/fakeData/projects";
import type { Project } from "@/fakeData/projects";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useCompanyId } from "./useCompanyId";
import { logger } from "@/utils/logger";
import { QUERY_CONFIG } from "@/utils/reactQueryConfig";

export interface CreateProjectData {
  name: string;
  client_id?: string;
  status?: "planifié" | "en_attente" | "en_cours" | "terminé" | "annulé";
  progress?: number;
  budget?: number;
  costs?: number;
  actual_revenue?: number;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

// Hook pour récupérer tous les projets
export const useProjects = () => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["projects", companyId],
    queryFn: async () => {
      if (fakeDataEnabled) {
        return FAKE_PROJECTS;
      }

      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");
          if (!companyId) {
            logger.warn("User is not a member of any company", { userId: user.id });
            return [];
          }

          const { data, error } = await supabase
            .from("projects")
            .select("id, user_id, company_id, client_id, name, status, budget, costs, actual_revenue, start_date, end_date, description, created_at, updated_at, client:clients(id, name, email)")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error) throw error;
          return data as Project[];
        },
        [],
        "useProjects"
      );
    },
    enabled: !!user && !isLoadingCompanyId && (!!companyId || fakeDataEnabled),
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour récupérer un projet par ID
export const useProject = (id: string | undefined) => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["project", id, companyId],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user || !id) throw new Error("User not authenticated or no ID provided");
          if (!companyId) {
            logger.warn("useProject: No company_id available");
            throw new Error("User is not a member of any company");
          }

          const { data, error } = await supabase
            .from("projects")
            .select("id, user_id, company_id, client_id, name, status, budget, costs, actual_revenue, start_date, end_date, description, created_at, updated_at, client:clients(id, name, email)")
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
    enabled: !!user && !!id && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour créer un projet
export const useCreateProject = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise pour créer un projet");
      }

      // Valider et normaliser le statut
      const validStatuses = ["planifié", "en_attente", "en_cours", "terminé", "annulé"] as const;
      const status = (projectData.status && validStatuses.includes(projectData.status)) 
        ? projectData.status 
        : "planifié";

      // Construire l'objet d'insertion en excluant les champs undefined
      // ⚠️ SÉCURITÉ : Ne JAMAIS envoyer company_id - le trigger backend le force depuis JWT
      const insertData: any = {
        user_id: user.id,
        // company_id: IGNORÉ volontairement - le trigger backend le force depuis JWT
        name: projectData.name,
        status: status,
      };

      // Ajouter les champs optionnels seulement s'ils sont définis
      // Note: progress est retiré car cette colonne n'existe pas dans toutes les versions de la table
      // if (projectData.progress !== undefined) insertData.progress = projectData.progress;
      if (projectData.client_id) insertData.client_id = projectData.client_id;
      if (projectData.budget !== undefined) insertData.budget = projectData.budget;
      if (projectData.costs !== undefined) insertData.costs = projectData.costs;
      if (projectData.actual_revenue !== undefined) insertData.actual_revenue = projectData.actual_revenue;
      if (projectData.start_date) insertData.start_date = projectData.start_date;
      if (projectData.end_date) insertData.end_date = projectData.end_date;
      if (projectData.description) insertData.description = projectData.description;
      const { data, error } = await supabase
        .from("projects")
        .insert(insertData)
        .select("id, user_id, company_id, client_id, name, status, budget, costs, actual_revenue, start_date, end_date, description, created_at, updated_at")
        .single();

      if (error) throw error;
      return data as Project;
    },
    onMutate: async (newProject) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["projects", companyId] });
      
      // Sauvegarder les données actuelles
      const previousProjects = queryClient.getQueryData<Project[]>(["projects", companyId]);
      
      // Mettre à jour optimistiquement avec un projet temporaire
      if (previousProjects) {
        const tempProject: Project = {
          id: `temp-${Date.now()}`,
          user_id: user!.id,
          company_id: companyId!,
          name: newProject.name,
          status: newProject.status || "planifié",
          budget: newProject.budget,
          costs: newProject.costs,
          actual_revenue: newProject.actual_revenue,
          start_date: newProject.start_date,
          end_date: newProject.end_date,
          description: newProject.description,
          client_id: newProject.client_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData<Project[]>(
          ["projects", companyId],
          [tempProject, ...previousProjects]
        );
      }
      
      return { previousProjects };
    },
    onSuccess: (newProject) => {
      // Remplacer le projet temporaire par le vrai
      queryClient.setQueryData<Project[]>(
        ["projects", companyId],
        (old) => {
          if (!old) return [newProject];
          return old.map(p => p.id.startsWith('temp-') ? newProject : p);
        }
      );
      
      toast({
        title: "Projet créé",
        description: "Le projet a été créé avec succès.",
      });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects", companyId], context.previousProjects);
      }
      
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
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...projectData }: UpdateProjectData) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise");
      }

      // Construire l'objet de mise à jour en excluant les champs undefined
      const updateData: any = {};
      
      if (projectData.name !== undefined) updateData.name = projectData.name;
      if (projectData.client_id !== undefined) updateData.client_id = projectData.client_id;
      if (projectData.status !== undefined) {
        // Valider et normaliser le statut
        const validStatuses = ["planifié", "en_attente", "en_cours", "terminé", "annulé"] as const;
        updateData.status = validStatuses.includes(projectData.status) 
          ? projectData.status 
          : "planifié";
      }
      // Note: progress est retiré car cette colonne n'existe pas dans toutes les versions de la table
      // if (projectData.progress !== undefined) updateData.progress = projectData.progress;
      if (projectData.budget !== undefined) updateData.budget = projectData.budget;
      if (projectData.costs !== undefined) updateData.costs = projectData.costs;
      if (projectData.actual_revenue !== undefined) updateData.actual_revenue = projectData.actual_revenue;
      if (projectData.start_date !== undefined) updateData.start_date = projectData.start_date;
      if (projectData.end_date !== undefined) updateData.end_date = projectData.end_date;
      if (projectData.description !== undefined) updateData.description = projectData.description;
      const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", companyId)
        .select("id, user_id, company_id, client_id, name, status, budget, costs, actual_revenue, start_date, end_date, description, created_at, updated_at")
        .single();

      if (error) throw error;
      return data as Project;
    },
    onMutate: async (updateData) => {
      const { id, ...updates } = updateData;
      
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["projects", companyId] });
      await queryClient.cancelQueries({ queryKey: ["project", id, companyId] });
      
      // Sauvegarder les données actuelles
      const previousProjects = queryClient.getQueryData<Project[]>(["projects", companyId]);
      const previousProject = queryClient.getQueryData<Project>(["project", id, companyId]);
      
      // Mettre à jour optimistiquement la liste
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          ["projects", companyId],
          previousProjects.map(p =>
            p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
          )
        );
      }
      
      // Mettre à jour optimistiquement le projet individuel
      if (previousProject) {
        queryClient.setQueryData<Project>(
          ["project", id, companyId],
          { ...previousProject, ...updates, updated_at: new Date().toISOString() }
        );
      }
      
      return { previousProjects, previousProject };
    },
    onSuccess: (updatedProject) => {
      // Mettre à jour avec les vraies données du serveur
      queryClient.setQueryData<Project[]>(
        ["projects", companyId],
        (old) => old?.map(p => p.id === updatedProject.id ? updatedProject : p)
      );
      queryClient.setQueryData(["project", updatedProject.id, companyId], updatedProject);
      
      toast({
        title: "Projet mis à jour",
        description: "Le projet a été mis à jour avec succès.",
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects", companyId], context.previousProjects);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(["project", variables.id, companyId], context.previousProject);
      }
      
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
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");
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
    onMutate: async (deletedId) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["projects", companyId] });
      
      // Sauvegarder les données actuelles
      const previousProjects = queryClient.getQueryData<Project[]>(["projects", companyId]);
      
      // Supprimer optimistiquement de la liste
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          ["projects", companyId],
          previousProjects.filter(p => p.id !== deletedId)
        );
      }
      
      // Supprimer le cache du projet individuel
      queryClient.removeQueries({ queryKey: ["project", deletedId, companyId] });
      
      return { previousProjects };
    },
    onSuccess: () => {
      toast({
        title: "Projet supprimé",
        description: "Le projet a été supprimé avec succès.",
      });
    },
    onError: (error: Error, _deletedId, context) => {
      // Rollback en cas d'erreur
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects", companyId], context.previousProjects);
      }
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};



