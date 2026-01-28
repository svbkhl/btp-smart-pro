/**
 * Configuration centralisée pour React Query
 * 
 * Ce fichier définit les configurations optimales pour différents types de données
 * afin d'améliorer les performances et réduire les requêtes réseau inutiles.
 */

export const QUERY_CONFIG = {
  /**
   * Données qui changent très rarement (paramètres, utilisateur, entreprise)
   * - Temps de fraîcheur: 30 minutes
   * - Pas de refetch automatique
   */
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 heure
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  /**
   * Données qui changent modérément (clients, projets, devis)
   * - Temps de fraîcheur: 5 minutes
   * - Pas de refetch automatique mais refetch au focus
   */
  MODERATE: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },

  /**
   * Données en temps réel (notifications, messages, planning)
   * - Temps de fraîcheur: 30 secondes
   * - Refetch toutes les 60 secondes
   */
  REALTIME: {
    staleTime: 30 * 1000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 60 secondes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },

  /**
   * Données volatiles (statistiques dashboard)
   * - Temps de fraîcheur: 1 minute
   * - Refetch au focus de la fenêtre
   */
  DASHBOARD: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
} as const;

/**
 * Configuration pour les mutations avec optimistic updates
 */
export const MUTATION_CONFIG = {
  /**
   * Retry strategy pour les mutations critiques
   */
  CRITICAL: {
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },

  /**
   * Pas de retry pour les mutations non-critiques
   */
  STANDARD: {
    retry: 1,
    retryDelay: 1000,
  },

  /**
   * Pas de retry pour les mutations rapides (like, mark as read, etc.)
   */
  FAST: {
    retry: 0,
  },
} as const;

/**
 * Helper pour générer une queryKey consistante
 */
export function createQueryKey(
  entity: string,
  identifier?: string | number,
  filters?: Record<string, any>
): (string | number | Record<string, any>)[] {
  const key: (string | number | Record<string, any>)[] = [entity];
  
  if (identifier !== undefined) {
    key.push(identifier);
  }
  
  if (filters && Object.keys(filters).length > 0) {
    key.push(filters);
  }
  
  return key;
}

/**
 * Helper pour optimistic update standard
 */
export function createOptimisticUpdater<TData, TVariables>(
  queryKey: unknown[],
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
) {
  return {
    onMutate: async (variables: TVariables) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey });
      
      // Sauvegarder les données actuelles
      const previousData = queryClient.getQueryData<TData>(queryKey);
      
      // Mettre à jour optimistiquement
      if (previousData) {
        queryClient.setQueryData<TData>(queryKey, updateFn(previousData, variables));
      }
      
      return { previousData };
    },
    onError: (_err: Error, _variables: TVariables, context: any) => {
      // Rollback en cas d'erreur
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Invalider pour resynchroniser avec le serveur
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

// Export d'une instance queryClient si nécessaire
import { QueryClient } from '@tanstack/react-query';

let queryClient: QueryClient;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          ...QUERY_CONFIG.MODERATE,
          retry: 2,
          throwOnError: false,
        },
        mutations: {
          ...MUTATION_CONFIG.STANDARD,
          throwOnError: false,
        },
      },
    });
  }
  return queryClient;
}
