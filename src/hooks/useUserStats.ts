import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_USER_STATS } from "@/fakeData/stats";

export interface UserStats {
  id: string;
  user_id: string;
  total_projects: number;
  total_clients: number;
  total_revenue: number;
  total_profit: number;
  active_projects: number;
  completed_projects: number;
  created_at: string;
  updated_at: string;
}

// Hook pour récupérer les statistiques utilisateur
export const useUserStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_stats", user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("user_stats")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error) {
            // Si les stats n'existent pas, créer un enregistrement vide
            if (error.code === "PGRST116") {
              const { data: newStats, error: insertError } = await supabase
                .from("user_stats")
                .insert({ user_id: user.id })
                .select()
                .single();

              if (insertError) {
                // Si erreur d'insertion et fake data activé, retourner fake data
                const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
                if (isFakeDataEnabled()) {
                  return FAKE_USER_STATS;
                }
                throw insertError;
              }
              return newStats as UserStats;
            }
            // Si autre erreur et fake data activé, retourner fake data
            // Sinon, lancer l'erreur pour que React Query gère l'état d'erreur
            const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
            if (isFakeDataEnabled()) {
              return FAKE_USER_STATS;
            }
            throw error;
          }
          return data as UserStats;
        },
        FAKE_USER_STATS,
        "useUserStats"
      );
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });
};

// Fonction pour recalculer les statistiques
export const useRecalculateStats = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Compter les projets
      const { count: totalProjects, error: totalProjectsError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (totalProjectsError) throw totalProjectsError;

      // Compter les projets actifs
      const { count: activeProjects, error: activeError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["planifié", "en_attente", "en_cours"]);

      if (activeError) throw activeError;

      // Compter les projets terminés
      const { count: completedProjectsCount, error: completedError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "terminé");

      if (completedError) throw completedError;

      // Récupérer tous les projets terminés avec leurs devis et bénéfices
      const { data: completedProjectsData, error: completedProjectsDataError } = await supabase
        .from("projects")
        .select(`
          id,
          budget,
          costs,
          benefice,
          ai_quotes (
            id,
            estimated_cost,
            details,
            status
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "terminé");

      if (completedProjectsDataError) throw completedProjectsDataError;

      // Calculer le CA total depuis les devis (TTC avec TVA 20%)
      let totalRevenue = 0;
      let totalCosts = 0;
      let totalProfit = 0;

      completedProjectsData?.forEach((project) => {
        // Ajouter les coûts du projet
        const projectCosts = Number(project.costs) || 0;
        totalCosts += projectCosts;

        // Calculer le CA depuis les devis liés (TTC)
        let projectRevenue = 0;
        
        if (project.ai_quotes && Array.isArray(project.ai_quotes) && project.ai_quotes.length > 0) {
          project.ai_quotes.forEach((quote: any) => {
            // Ne compter que les devis signés, acceptés ou envoyés
            if (quote.status && ['signed', 'accepted', 'sent'].includes(quote.status)) {
              let quoteAmount = 0;
              
              if (quote.estimated_cost) {
                // estimated_cost est déjà en HT, on ajoute la TVA (20%)
                quoteAmount = Number(quote.estimated_cost) * 1.20;
              } else if (quote.details) {
                // Essayer d'extraire depuis details
                const details = typeof quote.details === 'string' 
                  ? JSON.parse(quote.details) 
                  : quote.details;
                if (details?.estimatedCost) {
                  // estimatedCost est en HT, on ajoute la TVA (20%)
                  quoteAmount = Number(details.estimatedCost) * 1.20;
                }
              }
              
              projectRevenue += quoteAmount;
            }
          });
        }
        
        // Si aucun devis lié, utiliser le budget comme fallback
        if (projectRevenue === 0) {
          projectRevenue = Number(project.budget) || 0;
        }
        
        totalRevenue += projectRevenue;
        
        // Utiliser le bénéfice calculé si disponible, sinon le calculer
        if (project.benefice !== null && project.benefice !== undefined) {
          totalProfit += Number(project.benefice) || 0;
        } else {
          // Calculer le bénéfice : CA - Coûts
          const projectProfit = projectRevenue - projectCosts;
          totalProfit += projectProfit;
        }
      });

      // Le bénéfice total a déjà été calculé dans la boucle ci-dessus

      // Compter les clients
      const { count: totalClients, error: clientsError } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (clientsError) throw clientsError;

      // Mettre à jour les stats
      const { data, error: updateError } = await supabase
        .from("user_stats")
        .upsert({
          user_id: user.id,
          total_projects: totalProjects || 0,
          total_clients: totalClients || 0,
          total_revenue: totalRevenue,
          total_profit: totalProfit,
          active_projects: activeProjects || 0,
          completed_projects: completedProjectsCount || 0,
        })
        .select()
        .single();

      if (updateError) throw updateError;
      return data as UserStats;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
    },
  });
};

