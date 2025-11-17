import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook pour gérer le mode démo
 */
export const useDemoMode = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Vérifier si le mode démo est activé
  const isDemoMode = import.meta.env.VITE_APP_DEMO === 'true';

  // Seed des données de démo
  const seedDemo = useMutation({
    mutationFn: async (force: boolean = false) => {
      const { data, error } = await supabase.functions.invoke('seed-demo', {
        body: { force }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: '✅ Données de démo créées',
        description: 'Les données de démo ont été ajoutées avec succès.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Erreur',
        description: error.message || 'Impossible de créer les données de démo',
        variant: 'destructive',
      });
    },
  });

  // Purge des données de démo
  const purgeDemo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('purge-demo', {});

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: '✅ Données de démo supprimées',
        description: 'Toutes les données de démo ont été supprimées.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Erreur',
        description: error.message || 'Impossible de supprimer les données de démo',
        variant: 'destructive',
      });
    },
  });

  return {
    isDemoMode,
    seedDemo: seedDemo.mutate,
    purgeDemo: purgeDemo.mutate,
    isSeeding: seedDemo.isPending,
    isPurging: purgeDemo.isPending,
  };
};

