/**
 * Utilitaire pour extraire les UUID depuis des IDs qui peuvent contenir des suffixes
 * 
 * Utilisé pour extraire l'UUID réel depuis les liens de signature qui contiennent
 * un suffixe de sécurité (ex: "63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d")
 */

/**
 * Extrait l'UUID d'un ID qui peut contenir un suffixe de sécurité
 * 
 * Format accepté: "uuid" ou "uuid-suffix"
 * Exemple: "63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d" → "63bd2333-b130-4bf2-b25f-c7e194e588e8"
 * 
 * @param rawId - L'ID brut qui peut contenir un suffixe
 * @returns L'UUID extrait ou null si l'ID est invalide
 * 
 * @example
 * ```typescript
 * const rawId = "63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d";
 * const uuid = extractUUID(rawId);
 * // uuid = "63bd2333-b130-4bf2-b25f-c7e194e588e8"
 * ```
 */
export function extractUUID(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  
  // Méthode 1: Extraire les 36 premiers caractères (format UUID standard)
  // Un UUID fait toujours exactement 36 caractères (32 hex + 4 tirets)
  if (rawId.length >= 36) {
    const uuid = rawId.slice(0, 36);
    // Vérifier que c'est un UUID valide (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
      // ⚠️ LOG si on détecte un suffixe
      if (rawId.length > 36) {
        console.warn("⚠️ [extractUUID] ID avec suffixe détecté:", { 
          rawId, 
          extracted: uuid, 
          suffix: rawId.slice(36),
          stackTrace: new Error().stack
        });
      }
      return uuid;
    }
  }
  
  // Méthode 2: Utiliser une regex pour trouver l'UUID dans la chaîne
  // Utile si l'UUID n'est pas au début de la chaîne
  const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
  if (uuidMatch && uuidMatch[0]) {
    // ⚠️ LOG si on détecte un suffixe
    if (rawId.length > uuidMatch[0].length) {
      console.warn("⚠️ [extractUUID] ID avec suffixe détecté (regex):", { 
        rawId, 
        extracted: uuidMatch[0], 
        suffix: rawId.slice(uuidMatch[0].length),
        stackTrace: new Error().stack
      });
    }
    return uuidMatch[0];
  }
  
  // Si aucune méthode ne fonctionne, vérifier si l'ID original est un UUID valide
  // (cas où il n'y a pas de suffixe)
  if (rawId.length === 36 && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(rawId)) {
    return rawId;
  }
  
  // Si aucune méthode ne fonctionne, log l'erreur
  console.error("❌ [extractUUID] Impossible d'extraire l'UUID de:", rawId, {
    length: rawId.length,
    stackTrace: new Error().stack
  });
  return null;
}

/**
 * Valide qu'une chaîne est un UUID valide
 * 
 * @param uuid - La chaîne à valider
 * @returns true si c'est un UUID valide, false sinon
 */
export function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(uuid);
}

/**
 * Extrait et valide un UUID depuis un ID brut
 * 
 * @param rawId - L'ID brut qui peut contenir un suffixe
 * @returns L'UUID extrait et validé, ou null si invalide
 */
export function extractAndValidateUUID(rawId: string | null | undefined): string | null {
  const extracted = extractUUID(rawId);
  return extracted && isValidUUID(extracted) ? extracted : null;
}





