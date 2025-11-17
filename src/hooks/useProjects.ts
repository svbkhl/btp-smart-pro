import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_PROJECTS } from "@/fakeData/projects";

export interface Project {
  id: string;
  user_id: string;
  client_id?: string;
  name: string;
  status: "planifié" | "en_attente" | "en_cours" | "terminé" | "annulé";
  progress: number;
  budget?: number;
  costs?: number;
  benefice?: number; // Bénéfice calculé pour les projets terminés
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  // Relation avec client (joined)
  client?: {
    id: string;
    name: string;
    email?: string;
  };
  // Relation avec devis (joined)
  ai_quotes?: Array<{
    id: string;
    estimated_cost?: number;
    details?: any;
    status?: string;
  }>;
}

export interface CreateProjectData {
  client_id?: string;
  name: string;
  status?: "planifié" | "en_attente" | "en_cours" | "terminé" | "annulé";
  progress?: number;
  budget?: number;
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

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("projects")
            .select(`
              *,
              client:clients(id, name, email),
              ai_quotes(id, estimated_cost, details, status)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            // Si fake data activé → retourne FAKE_PROJECTS
            // Si fake data désactivé → retourne []
            throw error;
          }
          // Retourner les vraies données (même si vide)
          // queryWithTimeout gère le fallback automatiquement
          return (data as Project[]) || [];
        },
        FAKE_PROJECTS,
        "useProjects"
      );
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
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

          const { data, error } = await supabase
            .from("projects")
            .select(`
              *,
              client:clients(id, name, email),
              ai_quotes(id, estimated_cost, details, status)
            `)
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

          if (error) {
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            throw error;
          }
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
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

// Hook pour créer un projet
export const useCreateProject = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      if (!user) {
        console.error("User not authenticated");
        throw new Error("User not authenticated");
      }

      // Préparer les données pour l'insertion
      const insertData: any = {
        name: projectData.name,
        user_id: user.id,
        status: projectData.status || "planifié",
        progress: projectData.progress ?? 0,
      };

      // Ajouter les champs optionnels seulement s'ils sont définis
      if (projectData.client_id) {
        insertData.client_id = projectData.client_id;
      }
      if (projectData.budget !== undefined && projectData.budget !== null) {
        insertData.budget = projectData.budget;
      }
      if (projectData.location) {
        insertData.location = projectData.location;
      }
      // Les dates doivent être au format DATE (sans heure) ou NULL
      if (projectData.start_date) {
        // Extraire seulement la date (YYYY-MM-DD) si c'est un datetime
        insertData.start_date = projectData.start_date.split('T')[0];
      }
      if (projectData.end_date) {
        insertData.end_date = projectData.end_date.split('T')[0];
      }
      if (projectData.description) {
        insertData.description = projectData.description;
      }
      if (projectData.image_url) {
        insertData.image_url = projectData.image_url;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      toast({
        title: "Projet créé",
        description: "Le projet a été créé avec succès.",
      });
    },
    onError: (error: unknown) => {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : "Erreur lors de la création du projet";
      toast({
        title: "Erreur",
        description: errorMessage,
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

      const { data, error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
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

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
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

