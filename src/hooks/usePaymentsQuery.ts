import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { FAKE_PAYMENTS } from "@/fakeData/payments";
import { queryWithTimeout } from "@/utils/queryWithTimeout";

/**
 * Hook pour récupérer la liste des paiements (compatible avec Facturation.tsx)
 */
export const usePaymentsQuery = () => {
  const { fakeDataEnabled } = useFakeDataStore();
  
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      if (fakeDataEnabled) {
        console.log("🎮 [usePaymentsQuery] Mode démo actif - Retour des données factices");
        return FAKE_PAYMENTS;
      }
      
      return queryWithTimeout(
        async () => {
          const { data, error } = await supabase
            .from("payments")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;
          return data || [];
        },
        FAKE_PAYMENTS,
        "payments"
      );
    },
  });
};











