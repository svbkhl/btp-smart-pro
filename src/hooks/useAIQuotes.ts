/**
 * Hook pour charger les devis générés par l'IA
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAIQuotes = () => {
  return useQuery({
    queryKey: ['ai-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement devis IA:', error);
        throw error;
      }

      return data || [];
    },
    refetchInterval: 5000, // Refresh toutes les 5 secondes pour voir les mises à jour en temps réel
  });
};

