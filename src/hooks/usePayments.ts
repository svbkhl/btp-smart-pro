import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_PAYMENTS } from "@/fakeData/payments";

export interface Payment {
  id: string;
  user_id: string;
  project_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  client_id: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  project_id?: string | null;
  quote_id?: string | null;
  invoice_id?: string | null;
  client_id?: string | null;
  amount: number;
  due_date: string;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export const usePayments = () => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();

  return useQuery({
    queryKey: ["payments", user?.id, fakeDataEnabled],
    queryFn: async () => {
      if (fakeDataEnabled) {
        console.log("🔄 Mode démo: Utilisation des paiements factices");
        return FAKE_PAYMENTS;
      }

      if (!user) throw new Error("User not authenticated");

      // Si fake data est activé, retourner directement les fake data
      if (fakeDataEnabled) {
        console.log("🎭 Mode démo activé - Retour des fake payments");
        return FAKE_PAYMENTS;
      }

      // Sinon, faire la vraie requête
      return queryWithTimeout(
        async () => {
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) {
            console.warn("⚠️ Erreur paiements:", error);
            // Si la table n'existe pas, retourner un tableau vide
            if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
              console.log("📋 Table payments n'existe pas, retour d'un tableau vide");
              return [];
            }
            throw error;
          }
          
          return (data || []) as Payment[];
        },
        [],
        "usePayments"
      );
    },
    enabled: !!user || fakeDataEnabled,
  });
};

export const useCreatePayment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: CreatePaymentData) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...paymentData,
          user_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
};



