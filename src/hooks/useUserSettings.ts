import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";
import { logger } from "@/utils/logger";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_USER_SETTINGS } from "@/fakeData/userSettings";

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
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook pour récupérer les paramètres utilisateur (informations entreprise)
 * Les paramètres sont maintenant isolés par entreprise (company_id)
 */
export const useUserSettings = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["user_settings", companyId],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");
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

          // Si les settings n'existent pas, créer un enregistrement avec user_id et company_id (requis)
          if (!data) {
            const { data: newSettings, error: insertError } = await supabase
              .from("user_settings")
              .insert({
                user_id: user.id,
                company_id: companyId,
              })
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
    enabled: !!user && !isLoadingCompanyId && !!companyId,
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
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user) throw new Error("User not authenticated");
      if (!companyId) {
        throw new Error("User must be a member of a company");
      }

      // Ne pas envoyer company_id depuis le frontend, le trigger le forcera
      // Mais on doit inclure user_id lors d'un INSERT
      const { company_id, user_id, ...safeUpdates } = updates;

      logger.debug("useUpdateUserSettings: Updating user settings", { companyId, updates: safeUpdates });

      // Vérifier si l'enregistrement existe déjà
      const { data: existingSettings } = await supabase
        .from("user_settings")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();

      let data, error;
      
      if (existingSettings) {
        // Mise à jour d'un enregistrement existant
        ({ data, error } = await supabase
          .from("user_settings")
          .update({
            ...safeUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .select()
          .single());
      } else {
        // Création d'un nouvel enregistrement - inclure user_id explicitement
        // Le trigger ajoutera company_id automatiquement
        if (!user?.id) {
          throw new Error("User ID is required to create user settings");
        }
        
        ({ data, error } = await supabase
          .from("user_settings")
          .insert({
            ...safeUpdates,
            user_id: user.id, // Inclure user_id explicitement lors de la création
            updated_at: new Date().toISOString(),
          })
          .select()
          .single());
      }

      if (error) {
        console.error("❌ Erreur lors de la mise à jour des user_settings:", error);
        throw error;
      }

      logger.debug("useUpdateUserSettings: Settings updated successfully", { data });
      return data as UserSettings;
    },
    onSuccess: (data) => {
      // Mettre à jour le cache directement sans invalider (plus efficace)
      queryClient.setQueryData(["user_settings", companyId], data);
    },
    onError: (error) => {
      logger.error("useUpdateUserSettings: Error", { error });
    },
  });
};

/**
 * Hook pour créer les paramètres utilisateur (si n'existent pas)
 * Les paramètres sont maintenant isolés par entreprise (company_id)
 */
export const useCreateUserSettings = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      if (!user) throw new Error("User not authenticated");
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
      queryClient.invalidateQueries({ queryKey: ["user_settings", companyId] });
    },
  });
};


