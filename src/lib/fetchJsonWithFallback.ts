/**
 * Système unifié pour les requêtes avec timeout et fallback automatique vers fake data
 * Utilisé dans toute l'application pour garantir la stabilité et les performances
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
 * Fetch JSON avec timeout et fallback automatique vers fake data
 * 
 * @param url - URL à appeler
 * @param options - Options fetch (method, headers, body, etc.)
 * @param mockData - Données mock à retourner en cas de timeout ou erreur
 * @param queryName - Nom de la requête pour les logs (optionnel)
 * @returns Promise avec les données réelles ou mock
 */
export async function fetchJsonWithFallback<T>(
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
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Si c'est un timeout (AbortError) ou une erreur réseau
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message?.includes("timeout"))
    ) {
      return mockData;
    }

    // En cas d'erreur autre que timeout, utiliser aussi les données mock
    return mockData;
  }
}

/**
 * Helper pour les requêtes GET
 */
export async function fetchGetWithFallback<T>(
  url: string,
  mockData: T,
  queryName?: string
): Promise<T> {
  return fetchJsonWithFallback<T>(url, { method: "GET" }, mockData, queryName);
}

/**
 * Helper pour les requêtes POST
 */
export async function fetchPostWithFallback<T>(
  url: string,
  body: unknown,
  mockData: T,
  queryName?: string
): Promise<T> {
  return fetchJsonWithFallback<T>(
    url,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    mockData,
    queryName
  );
}

