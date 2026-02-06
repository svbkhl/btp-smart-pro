import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useOnboardingReplay } from "@/contexts/OnboardingContext";
import { isSystemAdmin, isAdminEmail } from "@/config/admin";

const ONBOARDING_QUERY_KEY = ["onboarding_completed"];
const ONBOARDING_STORAGE_KEY = "btp_onboarding_completed";

/**
 * Vérifie si l'utilisateur a déjà complété (ou skippé) l'onboarding.
 * Affiche aussi le guide si l'utilisateur a demandé "Revoir le guide" depuis Paramètres (replay sans modifier la BDD).
 * Les admins système ne voient pas le guide automatiquement (première connexion uniquement pour les comptes non-admin).
 */
export function useOnboarding() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { replayRequested, clearReplay, requestReplay } = useOnboardingReplay();

  // Admin système connu dès le JWT (évite que le guide s'affiche le temps que checkAdminStatus finisse)
  const isAdminSystem = isSystemAdmin(user);
  const isAdminOrPending = isAdmin || isAdminSystem;

  // Dès qu'on sait que c'est un admin, marquer onboarding complété dans le cache (évite tout flash du guide)
  useEffect(() => {
    if (user?.id && isAdminOrPending) {
      queryClient.setQueryData([...ONBOARDING_QUERY_KEY, user.id], true);
    }
  }, [user?.id, isAdminOrPending, queryClient]);

  const { data: completed, isLoading } = useQuery({
    queryKey: [...ONBOARDING_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return true; // Pas connecté = ne pas afficher le guide
      // Admin système = ne jamais afficher le guide (priorité absolue)
      const sysAdmin = isSystemAdmin(user);
      if (sysAdmin) {
        try {
          const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
          const parsed = stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
          parsed[user.id] = true;
          localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(parsed));
        } catch (_) {}
        return true;
      }
      // Fallback localStorage (guide déjà passé dans ce navigateur)
      try {
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, boolean>;
          if (parsed[user.id] === true) return true;
        }
      } catch (_) {}
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
      // Toujours marquer en localStorage pour que le guide ne réapparaisse plus
      try {
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        const parsed = stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
        parsed[user.id] = true;
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(parsed));
      } catch (_) {}
      const { data: updated, error: updateError } = await supabase
        .from("user_settings")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id)
        .select("id");
      if (updateError) throw updateError;
      // Si aucune ligne n'existait (nouveau ou admin sans company), en créer une
      if ((updated ?? []).length === 0) {
        const row: { user_id: string; onboarding_completed: boolean; company_id?: string | null } = {
          user_id: user.id,
          onboarding_completed: true,
        };
        if (companyId) row.company_id = companyId;
        const { error: insertError } = await supabase
          .from("user_settings")
          .insert(row);
        if (insertError) {
          // Ignorer si contrainte (ex. company_id requis) — localStorage suffit
        }
      }
    },
    onSuccess: () => {
      queryClient.setQueryData([...ONBOARDING_QUERY_KEY, user?.id], true);
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
    },
  });

  // Jamais afficher le guide pour les emails admin (double verrou)
  const isAdminByEmail = isAdminEmail(user?.email);
  const showOnboarding =
    !!user &&
    !authLoading &&
    !isLoading &&
    !isAdminByEmail &&
    !isAdminOrPending &&
    (completed === false || replayRequested);
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
