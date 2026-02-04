import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useOnboardingReplay } from "@/contexts/OnboardingContext";

const ONBOARDING_QUERY_KEY = ["onboarding_completed"];

/**
 * Vérifie si l'utilisateur a déjà complété (ou skippé) l'onboarding.
 * Affiche aussi le guide si l'utilisateur a demandé "Revoir le guide" depuis Paramètres (replay sans modifier la BDD).
 */
export function useOnboarding() {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { replayRequested, clearReplay, requestReplay } = useOnboardingReplay();

  const { data: completed, isLoading } = useQuery({
    queryKey: [...ONBOARDING_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return true; // Pas connecté = ne pas afficher le guide
      const { data, error } = await supabase
        .from("user_settings")
        .select("onboarding_completed")
        .eq("user_id", user.id);
      if (error) throw error;
      const hasCompleted = (data ?? []).some((row) => row.onboarding_completed === true);
      return hasCompleted;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { data: updated, error: updateError } = await supabase
        .from("user_settings")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id)
        .select("id");
      if (updateError) throw updateError;
      // Si l'utilisateur n'avait aucune ligne (nouveau), en créer une avec company_id
      if ((updated ?? []).length === 0 && companyId) {
        const { error: insertError } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            company_id: companyId,
            onboarding_completed: true,
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData([...ONBOARDING_QUERY_KEY, user?.id], true);
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
    },
  });

  const showOnboarding = !!user && !isLoading && (completed === false || replayRequested);
  const isReplay = replayRequested;

  const completeOnboarding = (isReplayMode?: boolean) => {
    if (isReplayMode || replayRequested) {
      clearReplay();
    } else {
      completeMutation.mutateAsync();
    }
  };

  return {
    showOnboarding,
    completeOnboarding,
    isReplay,
    requestReplay,
    isLoading: isLoading || completeMutation.isPending,
  };
}
