/**
 * @deprecated Use useCompanyId hook instead
 * 
 * Ce fichier est conservé uniquement pour la compatibilité avec le code existant.
 * Pour tout nouveau code, utilisez le hook useCompanyId() :
 * 
 * @example
 * ```tsx
 * import { useCompanyId } from '@/hooks/useCompanyId';
 * 
 * const { companyId, isLoading, error } = useCompanyId();
 * ```
 */

export { useCompanyId, setCurrentCompanyId, getUserCompanies } from "@/hooks/useCompanyId";

// Note: getCurrentCompanyId est obsolète, utilisez useCompanyId hook à la place
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

/**
 * Fonction utilitaire pour récupérer le company_id d'un utilisateur
 * À utiliser dans les services et utilitaires non-React
 * Pour les composants React, utilisez le hook useCompanyId() à la place
 * 
 * @param userId - ID de l'utilisateur
 * @returns Promise<string | null> - Le company_id ou null si non trouvé
 */
export async function getCompanyIdForUser(userId: string): Promise<string | null> {
  try {
    const selectedCompanyId = localStorage.getItem(`selectedCompanyId_${userId}`);
    
    if (selectedCompanyId) {
      const { data: verifyData, error: verifyError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", userId)
        .eq("company_id", selectedCompanyId)
        .maybeSingle();
      
      if (!verifyError && verifyData) {
        return selectedCompanyId;
      } else {
        localStorage.removeItem(`selectedCompanyId_${userId}`);
      }
    }
    
    const { data, error } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error && (error.code === "42703" || error.message?.includes('column "status" does not exist'))) {
      const { data: dataNoStatus, error: errorNoStatus } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (errorNoStatus) {
        logger.error("Error fetching company_id", errorNoStatus);
        return null;
      }

      return dataNoStatus?.company_id || null;
    }

    if (error) {
      logger.error("Error fetching company_id", error);
      return null;
    }

    return data?.company_id || null;
  } catch (error) {
    logger.error("Error in getCompanyIdForUser", error);
    return null;
  }
}

/**
 * @deprecated Use getCompanyIdForUser() for services/utils or useCompanyId() hook for React components
 */
export async function getCurrentCompanyId(userId: string): Promise<string | null> {
  logger.warn("getCurrentCompanyId is deprecated. Use useCompanyId hook for React components or getCompanyIdForUser() for services/utils.");
  return getCompanyIdForUser(userId);
}
