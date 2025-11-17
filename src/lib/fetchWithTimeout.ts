/**
 * Utilitaire global pour les requêtes fetch avec timeout et fallback fake data
 * Utilisé pour remplacer les fetch classiques dans toute l'application
 */

import { useFakeDataStore } from "@/store/useFakeDataStore";

export const FETCH_TIMEOUT = 3000; // 3 secondes

/**
 * Vérifie si le mode fake data est activé
 */
export const isFakeDataEnabled = (): boolean => {
  try {
    const state = useFakeDataStore.getState();
    return state.fakeDataEnabled;
  } catch (e) {
    // Si le store n'est pas encore initialisé, utiliser l'env
    return import.meta.env.VITE_FAKE_DATA === "true" || import.meta.env.VITE_FAKE_DATA === "ON";
  }
};

/**
 * Fetch avec timeout et fallback automatique vers fake data
 * 
 * @param url - URL à appeler
 * @param options - Options fetch standard
 * @param mockData - Données mock à retourner en cas de timeout ou erreur
 * @param queryName - Nom de la requête pour les logs
 * @returns Promise avec les données réelles ou mock
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  mockData: T,
  queryName: string = "fetch"
): Promise<T> {
  // Si fake data est activé, retourner directement les données mock
  if (isFakeDataEnabled()) {
    return Promise.resolve(mockData);
  }

  // Créer un AbortController pour le timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // En cas de timeout ou erreur, utiliser les données mock
    return mockData;
  }
}

/**
 * Fetch JSON avec timeout et fallback
 * Alias pour fetchWithTimeout avec Content-Type: application/json
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  body?: any,
  mockData: T,
  queryName: string = "fetchJson"
): Promise<T> {
  return fetchWithTimeout<T>(
    url,
    {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
    mockData,
    queryName
  );
}

