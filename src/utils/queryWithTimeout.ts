/**
 * Utilitaire pour ajouter un timeout aux requêtes Supabase
 * Affiche des données mock si la requête dépasse 3 secondes
 * Utilise le store global useFakeDataStore pour gérer l'état
 */

import { useFakeDataStore } from "@/store/useFakeDataStore";

export const QUERY_TIMEOUT = 3000; // 3 secondes

// Vérifier si le mode fake data est activé (via store global ou env)
export const isFakeDataEnabled = () => {
  // Vérifier d'abord le store global (priorité)
  try {
    const state = useFakeDataStore.getState();
    if (state.fakeDataEnabled) return true;
  } catch (e) {
    // Si le store n'est pas encore initialisé, utiliser l'env
  }
  // Fallback sur la variable d'environnement
  return import.meta.env.VITE_FAKE_DATA === "true" || import.meta.env.VITE_FAKE_DATA === "ON";
};

export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  mockData: T,
  queryName: string = "query"
): Promise<T> {
  // Si fake data est activé, retourner directement les données mock
  if (isFakeDataEnabled()) {
    return Promise.resolve(mockData);
  }

  // Si fake data n'est pas activé, essayer la vraie requête
  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          reject(new Error("TIMEOUT"));
        }, QUERY_TIMEOUT)
      ),
    ]);
    
    // Retourner les vraies données, même si c'est un tableau vide
    // NE JAMAIS retourner fake data si fake data est désactivé
    return result;
  } catch (error) {
    // En cas de timeout ou erreur, si fake data est désactivé
    // Retourner un tableau vide (pour les tableaux) ou null (pour les objets)
    // pour que l'application affiche un état vide plutôt que des fake data
    if (Array.isArray(mockData)) {
      return [] as T; // Retourner un tableau vide, pas de fake data
    }
    // Pour les objets, retourner null ou undefined
    // Ne pas retourner mockData si fake data est désactivé
    return null as T;
  }
}

