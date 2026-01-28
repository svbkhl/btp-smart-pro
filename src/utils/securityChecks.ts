/**
 * Module de vérifications de sécurité pour l'isolation multi-tenant
 * 
 * Ce module centralise toutes les vérifications de sécurité critiques pour garantir
 * que les données d'une entreprise ne peuvent pas être lues, modifiées ou supprimées
 * par les utilisateurs d'une autre entreprise.
 * 
 * IMPORTANT: Ces vérifications sont une DOUBLE PROTECTION en plus des RLS policies
 * de Supabase. Ne jamais supprimer ces vérifications même si RLS fonctionne.
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";
import { 
  createPermissionError, 
  createNotFoundError, 
  handleSupabaseError,
  AppError 
} from "./errors";

/**
 * Type pour les tables supportées par les vérifications de sécurité
 */
export type SecureTable = 
  | "clients" 
  | "projects" 
  | "invoices" 
  | "quotes" 
  | "employees" 
  | "events"
  | "notifications";

/**
 * Vérifie qu'une ressource (client, projet, etc.) appartient à l'entreprise spécifiée
 * 
 * POURQUOI: Cette vérification empêche un utilisateur de l'entreprise A d'accéder
 * à une ressource de l'entreprise B, même si RLS est mal configuré.
 * 
 * @param table - Nom de la table à vérifier
 * @param resourceId - ID de la ressource
 * @param expectedCompanyId - ID de l'entreprise attendue
 * @returns true si la ressource appartient à l'entreprise, false sinon
 * @throws AppError si erreur de base de données
 * 
 * @example
 * ```typescript
 * const isOwned = await verifyResourceOwnership("clients", clientId, companyId);
 * if (!isOwned) {
 *   throw createPermissionError("Accès refusé");
 * }
 * ```
 */
export async function verifyResourceOwnership(
  table: SecureTable,
  resourceId: string,
  expectedCompanyId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("id, company_id")
      .eq("id", resourceId)
      .maybeSingle();

    if (error) {
      throw handleSupabaseError(error, `la vérification de propriété de ${table}`);
    }

    // Ressource introuvable
    if (!data) {
      return false;
    }

    // Vérifier que company_id correspond
    const isOwned = data.company_id === expectedCompanyId;

    if (!isOwned) {
      logger.security(`Resource ownership check failed`, {
        table,
        resourceId,
        resourceCompanyId: data.company_id,
        expectedCompanyId,
      });
    }

    return isOwned;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw handleSupabaseError(error, `la vérification de propriété de ${table}`);
  }
}

/**
 * Vérifie qu'un client appartient à l'entreprise spécifiée
 * 
 * POURQUOI: Fonction spécialisée pour les clients, utilisée fréquemment.
 * Wrapper autour de verifyResourceOwnership pour une meilleure lisibilité.
 * 
 * @param clientId - ID du client
 * @param companyId - ID de l'entreprise
 * @returns true si le client appartient à l'entreprise
 */
export async function verifyClientOwnership(
  clientId: string,
  companyId: string
): Promise<boolean> {
  return verifyResourceOwnership("clients", clientId, companyId);
}

/**
 * Compte le nombre d'occurrences d'une ressource avec un ID donné
 * 
 * POURQUOI: Dans une base de données bien configurée, chaque ID doit être unique.
 * Si plusieurs ressources partagent le même ID entre entreprises, c'est un bug critique
 * qui peut entraîner la suppression de données dans plusieurs entreprises.
 * 
 * @param table - Nom de la table
 * @param resourceId - ID de la ressource
 * @returns Nombre total d'occurrences de cet ID (toutes entreprises confondues)
 * @throws AppError si erreur de base de données
 */
export async function countResourceOccurrences(
  table: SecureTable,
  resourceId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("id", resourceId);

    if (error) {
      throw handleSupabaseError(error, `le comptage des occurrences de ${table}`);
    }

    return count || 0;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw handleSupabaseError(error, `le comptage des occurrences de ${table}`);
  }
}

/**
 * Vérifie qu'une ressource peut être supprimée en toute sécurité
 * 
 * POURQUOI: Cette fonction effectue TOUTES les vérifications de sécurité nécessaires
 * avant une suppression pour garantir que:
 * 1. La ressource existe
 * 2. Elle appartient à la bonne entreprise
 * 3. Il n'y a pas de duplicata avec le même ID dans d'autres entreprises
 * 4. Exactement 1 ressource sera supprimée (pas 0, pas 2+)
 * 
 * Ces vérifications empêchent:
 * - Suppression dans la mauvaise entreprise
 * - Suppression accidentelle de plusieurs ressources
 * - Suppression de ressources appartenant à d'autres entreprises
 * 
 * @param table - Nom de la table
 * @param resourceId - ID de la ressource à supprimer
 * @param companyId - ID de l'entreprise
 * @throws AppError si une vérification échoue
 * 
 * @example
 * ```typescript
 * await verifyBeforeDelete("clients", clientId, companyId);
 * // Si on arrive ici, la suppression est sûre
 * await supabase.from("clients").delete().eq("id", clientId).eq("company_id", companyId);
 * ```
 */
export async function verifyBeforeDelete(
  table: SecureTable,
  resourceId: string,
  companyId: string
): Promise<void> {
  // ÉTAPE 1: Vérifier le nombre total d'occurrences de cet ID
  // POURQUOI: Si plusieurs ressources ont le même ID, c'est un bug critique
  const totalCount = await countResourceOccurrences(table, resourceId);

  if (totalCount === 0) {
    throw createNotFoundError(getResourceTypeName(table));
  }

  if (totalCount > 1) {
    logger.security(`Multiple resources with same ID detected before delete`, {
      table,
      resourceId,
      count: totalCount,
    });
    throw createPermissionError(
      `Impossible de supprimer cette ressource pour des raisons de sécurité. Veuillez contacter le support.`,
      `Multiple ${table} with ID ${resourceId} found (count: ${totalCount})`
    );
  }

  // ÉTAPE 2: Vérifier que la ressource appartient à l'entreprise
  // POURQUOI: Empêche la suppression d'une ressource d'une autre entreprise
  try {
    const { data: resource, error: fetchError } = await supabase
      .from(table)
      .select("id, company_id")
      .eq("id", resourceId)
      .maybeSingle();

    if (fetchError) {
      throw handleSupabaseError(fetchError, `la vérification de ${table}`);
    }

    if (!resource) {
      throw createNotFoundError(getResourceTypeName(table));
    }

    if (resource.company_id !== companyId) {
      logger.security(`Unauthorized delete attempt detected`, {
        table,
        resourceId,
        resourceCompanyId: resource.company_id,
        userCompanyId: companyId,
      });
      throw createPermissionError(
        `Vous n'avez pas la permission de supprimer cette ressource.`,
        `Resource belongs to company ${resource.company_id}, user is in company ${companyId}`
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw handleSupabaseError(error, `la vérification de ${table}`);
  }

  // ÉTAPE 3: Vérifier qu'exactement 1 ressource sera supprimée
  // POURQUOI: Double vérification que la requête DELETE affectera exactement 1 ligne
  try {
    const { count: deleteCount, error: countError } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("id", resourceId)
      .eq("company_id", companyId);

    if (countError) {
      throw handleSupabaseError(countError, `le comptage des ressources à supprimer`);
    }

    if (deleteCount !== 1) {
      logger.security(`Invalid delete count detected`, {
        table,
        resourceId,
        companyId,
        count: deleteCount,
      });
      throw createPermissionError(
        `Impossible de supprimer cette ressource pour des raisons de sécurité.`,
        `Expected 1 resource to delete, found ${deleteCount}`
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw handleSupabaseError(error, `le comptage des ressources à supprimer`);
  }

  // Toutes les vérifications sont passées ✅
  logger.debug(`Delete security checks passed`, { table, resourceId, companyId });
}

/**
 * Valide que toutes les données retournées appartiennent à l'entreprise attendue
 * 
 * POURQUOI: Cette fonction est une DOUBLE PROTECTION au cas où RLS ne fonctionne pas.
 * Si RLS échoue et retourne des données d'autres entreprises, cette fonction les filtre
 * et LOG un avertissement de sécurité critique.
 * 
 * Cette fonction NE DOIT JAMAIS filtrer de données si RLS fonctionne correctement.
 * Si elle filtre des données, c'est un BUG CRITIQUE dans RLS qui doit être corrigé.
 * 
 * @param data - Tableau de données à valider
 * @param expectedCompanyId - ID de l'entreprise attendue
 * @param context - Contexte pour les logs (ex: "useClients query")
 * @returns Tableau filtré contenant uniquement les données de l'entreprise
 * 
 * @example
 * ```typescript
 * const { data } = await supabase.from("clients").select("*").eq("company_id", companyId);
 * const safeData = validateDataIsolation(data || [], companyId, "useClients");
 * ```
 */
export function validateDataIsolation<T extends { company_id?: string }>(
  data: T[],
  expectedCompanyId: string,
  context: string = "query"
): T[] {
  if (!data || data.length === 0) {
    return [];
  }

  // Filtrer les données par company_id
  const filteredData = data.filter((item) => {
    const matches = item.company_id === expectedCompanyId;

    // LOG CRITIQUE si une donnée ne correspond pas
    if (!matches && item.company_id) {
      logger.security(`RLS FAILURE: Data from wrong company detected`, {
        context,
        itemCompanyId: item.company_id,
        expectedCompanyId,
        itemId: (item as any).id,
      });
    }

    return matches;
  });

  // Si des données ont été filtrées, RLS a échoué
  if (filteredData.length !== data.length) {
    logger.security(`RLS FAILURE: Frontend had to filter data`, {
      context,
      totalFromDatabase: data.length,
      filteredCount: filteredData.length,
      removedCount: data.length - filteredData.length,
      expectedCompanyId,
    });
  }

  return filteredData;
}

/**
 * Valide qu'une seule donnée appartient à l'entreprise attendue
 * 
 * POURQUOI: Version spécialisée de validateDataIsolation pour une seule ressource.
 * Utilisée après .maybeSingle() ou .single().
 * 
 * @param data - Donnée à valider
 * @param expectedCompanyId - ID de l'entreprise attendue
 * @param context - Contexte pour les logs
 * @returns La donnée si elle appartient à l'entreprise, null sinon
 */
export function validateSingleDataIsolation<T extends { company_id?: string }>(
  data: T | null,
  expectedCompanyId: string,
  context: string = "query"
): T | null {
  if (!data) {
    return null;
  }

  if (data.company_id !== expectedCompanyId) {
    logger.security(`RLS FAILURE: Single data from wrong company detected`, {
      context,
      dataCompanyId: data.company_id,
      expectedCompanyId,
      dataId: (data as any).id,
    });
    return null;
  }

  return data;
}

/**
 * Retourne le nom lisible d'une ressource selon le type de table
 * 
 * @param table - Nom de la table
 * @returns Nom de la ressource en français
 */
function getResourceTypeName(table: SecureTable): string {
  const names: Record<SecureTable, string> = {
    clients: "Client",
    projects: "Projet",
    invoices: "Facture",
    quotes: "Devis",
    employees: "Employé",
    events: "Événement",
    notifications: "Notification",
  };

  return names[table] || "Ressource";
}

/**
 * Vérifie qu'un utilisateur appartient à une entreprise
 * 
 * POURQUOI: Validation fondamentale avant toute opération nécessitant un company_id.
 * 
 * @param userId - ID de l'utilisateur
 * @param companyId - ID de l'entreprise à vérifier
 * @returns true si l'utilisateur appartient à l'entreprise
 */
export async function verifyUserBelongsToCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("company_users")
      .select("user_id, company_id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("Error verifying user company membership", error);
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error("Error in verifyUserBelongsToCompany", error);
    return false;
  }
}

/**
 * Valide qu'un ID est un UUID valide
 * 
 * POURQUOI: Empêche les injections et erreurs de base de données.
 * 
 * @param id - ID à valider
 * @returns true si c'est un UUID valide
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
