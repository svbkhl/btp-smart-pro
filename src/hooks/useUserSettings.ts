import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_USER_SETTINGS } from "@/fakeData/userSettings";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

export interface UserSettings {
  id: string;
  user_id: string;
  company_id?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  siret?: string;
  vat_number?: string;
  legal_form?: string;
  company_logo_url?: string;
  terms_and_conditions?: string;
  signature_data?: string;
  signature_name?: string;
  notifications_enabled?: boolean;
  reminder_enabled?: boolean;
  email_notifications?: boolean;
  auto_signature?: boolean;
  auto_send_email?: boolean;
  app_base_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook pour récupérer les paramètres utilisateur (informations entreprise)
 * Les paramètres sont maintenant isolés par entreprise (company_id)
 */
export const useUserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          // Récupérer le company_id de l'utilisateur
          const companyId = await getCurrentCompanyId(user.id);
          if (!companyId) {
            throw new Error("User must be a member of a company");
          }

          const { data, error } = await supabase
            .from("user_settings")
            .select("*")
            .eq("company_id", companyId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          // Si les settings n'existent pas, créer un enregistrement vide
          // Le trigger force_company_id_for_user_settings ajoutera automatiquement company_id
          if (!data) {
            const { data: newSettings, error: insertError } = await supabase
              .from("user_settings")
              .insert({})
              .select()
              .single();

            if (insertError) {
              // Si erreur d'insertion et fake data activé, retourner fake data
              const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
              if (isFakeDataEnabled()) {
                return FAKE_USER_SETTINGS;
              }
              throw insertError;
            }

            if (!newSettings) {
              throw new Error("Failed to create user settings");
            }

            return newSettings as UserSettings;
          }

          // Si fake data activé, retourner fake data
          const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
          if (isFakeDataEnabled()) {
            return FAKE_USER_SETTINGS;
          }

          // data existe forcément ici car on a vérifié !data plus haut
          return data as UserSettings;
        },
        {
          timeout: 5000,
          fallback: FAKE_USER_SETTINGS,
        }
      );
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 heure - données rarement modifiées
    gcTime: 24 * 60 * 60 * 1000, // 24 heures en cache
    retry: 2,
  });
};

/**
 * Hook pour mettre à jour les paramètres utilisateur
 * Les paramètres sont maintenant isolés par entreprise (company_id)
 */
export const useUpdateUserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user) throw new Error("User not authenticated");

      // Récupérer le company_id de l'utilisateur
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User must be a member of a company");
      }

      // Ne pas envoyer company_id depuis le frontend, le trigger le forcera
      const { company_id, user_id, ...safeUpdates } = updates;

      console.log("🔄 Mise à jour des user_settings:", { company_id, updates: safeUpdates });

      // Utiliser upsert pour créer l'enregistrement s'il n'existe pas
      // Le trigger ajoutera automatiquement company_id
      const { data, error } = await supabase
        .from("user_settings")
        .upsert(
          {
            ...safeUpdates,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "company_id",
          }
        )
        .select()
        .single();

      if (error) {
        console.error("❌ Erreur lors de la mise à jour des user_settings:", error);
        throw error;
      }

      console.log("✅ user_settings mis à jour avec succès:", data);
      return data as UserSettings;
    },
    onSuccess: (data) => {
      console.log("✅ onSuccess appelé, invalidation du cache");
      queryClient.invalidateQueries({ queryKey: ["user_settings", user?.id] });
      // Mettre à jour le cache directement
      queryClient.setQueryData(["user_settings", user?.id], data);
    },
    onError: (error) => {
      console.error("❌ Erreur dans onError:", error);
    },
  });
};

/**
 * Hook pour créer les paramètres utilisateur (si n'existent pas)
 * Les paramètres sont maintenant isolés par entreprise (company_id)
 */
export const useCreateUserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      if (!user) throw new Error("User not authenticated");

      // Récupérer le company_id de l'utilisateur
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User must be a member of a company");
      }

      // Ne pas envoyer company_id depuis le frontend, le trigger le forcera
      const { company_id, user_id, ...safeSettings } = settings;

      const { data, error } = await supabase
        .from("user_settings")
        .insert(safeSettings)
        .select()
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_settings", user?.id] });
    },
  });
};


