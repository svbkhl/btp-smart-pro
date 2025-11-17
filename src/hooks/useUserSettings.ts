import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_USER_SETTINGS } from "@/fakeData/userSettings";

export interface UserSettings {
  id: string;
  user_id: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company_logo_url?: string;
  siret?: string;
  vat_number?: string;
  legal_form?: string;
  terms_and_conditions?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  signature_data?: string;
  signature_name?: string;
  notifications_enabled: boolean;
  reminder_enabled: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserSettingsData {
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company_logo_url?: string;
  siret?: string;
  vat_number?: string;
  legal_form?: string;
  terms_and_conditions?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  signature_data?: string;
  signature_name?: string;
  notifications_enabled?: boolean;
  reminder_enabled?: boolean;
  email_notifications?: boolean;
}

// Hook pour récupérer les paramètres utilisateur
export const useUserSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("user_settings")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error) {
            // Si les settings n'existent pas, créer un enregistrement vide
            if (error.code === "PGRST116") {
              const { data: newSettings, error: insertError } = await supabase
                .from("user_settings")
                .insert({ user_id: user.id })
                .select()
                .single();

              if (insertError) {
                // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
                throw insertError;
              }
              return newSettings as UserSettings;
            }
            // En cas d'erreur, queryWithTimeout gère automatiquement le fallback
            throw error;
          }
          return data as UserSettings;
        },
        FAKE_USER_SETTINGS,
        "useUserSettings"
      );
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

// Hook pour mettre à jour les paramètres utilisateur
export const useUpdateUserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settingsData: UpdateUserSettingsData) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_settings")
        .update(settingsData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
      toast({
        title: "Paramètres mis à jour",
        description: "Vos paramètres ont été sauvegardés avec succès.",
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

