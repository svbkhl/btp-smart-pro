/**
 * Hook custom pour gérer le company_id de l'utilisateur
 * 
 * Centralise toute la logique de récupération du company_id avec :
 * - Cache React Query
 * - Support multi-entreprises via localStorage
 * - Vérifications de sécurité
 * - Gestion d'erreurs
 * 
 * @example
 * ```tsx
 * const { companyId, isLoading, error } = useCompanyId();
 * ```
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logger } from "@/utils/logger";

interface UseCompanyIdReturn {
  companyId: string | null;
  isLoading: boolean;
  error: Error | null;
}

export const useCompanyId = (): UseCompanyIdReturn => {
  const { user } = useAuth();

  const { data: companyId, isLoading, error } = useQuery({
    queryKey: ["companyId", user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user?.id) {
        return null;
      }

      try {
        // 1. Vérifier si un company_id a été sélectionné manuellement (localStorage)
        const selectedCompanyId = localStorage.getItem(`selectedCompanyId_${user.id}`);
        
        if (selectedCompanyId) {
          // Vérifier que ce company_id existe bien pour cet utilisateur
          const { data: verifyData, error: verifyError } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .eq("company_id", selectedCompanyId)
            .maybeSingle();
          
          if (!verifyError && verifyData) {
            logger.debug("Using selected company from localStorage", { 
              userId: user.id, 
              companyId: selectedCompanyId 
            });
            return selectedCompanyId;
          } else {
            // Company_id sélectionné n'est plus valide, le supprimer
            logger.warn("Selected company_id no longer valid, removing from localStorage", {
              userId: user.id,
              invalidCompanyId: selectedCompanyId
            });
            localStorage.removeItem(`selectedCompanyId_${user.id}`);
          }
        }
        
        // 2. Récupérer le premier company_id actif
        const { data, error: queryError } = await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        // Si erreur car la colonne status n'existe pas, réessayer sans status
        if (queryError && (queryError.code === "42703" || queryError.message?.includes('column "status" does not exist'))) {
          logger.debug("Retrying query without status column");
          
          const { data: dataNoStatus, error: errorNoStatus } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (errorNoStatus) {
            logger.error("Error fetching company_id", errorNoStatus);
            throw new Error("Impossible de récupérer l'entreprise de l'utilisateur");
          }

          return dataNoStatus?.company_id || null;
        }

        if (queryError) {
          logger.error("Error fetching company_id", queryError);
          throw new Error("Impossible de récupérer l'entreprise de l'utilisateur");
        }

        if (!data?.company_id) {
          logger.warn("User is not a member of any company", { userId: user.id });
        }

        return data?.company_id || null;
      } catch (error) {
        logger.error("Error in useCompanyId", error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes - Cache très agressif
    gcTime: 60 * 60 * 1000, // 60 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    companyId: companyId ?? null,
    isLoading,
    error: error as Error | null,
  };
};

/**
 * Définit le company_id actif pour l'utilisateur
 * À utiliser quand l'utilisateur appartient à plusieurs entreprises
 * 
 * @param userId - ID de l'utilisateur
 * @param companyId - ID de l'entreprise à sélectionner
 */
export const setCurrentCompanyId = (userId: string, companyId: string): void => {
  localStorage.setItem(`selectedCompanyId_${userId}`, companyId);
  logger.info("Company switched", { userId, companyId });
};

/**
 * Récupère toutes les entreprises auxquelles l'utilisateur appartient
 * 
 * @param userId - ID de l'utilisateur
 * @returns Liste des entreprises
 */
export const getUserCompanies = async (userId: string): Promise<Array<{id: string, name: string}>> => {
  try {
    const { data, error } = await supabase
      .from("company_users")
      .select("company_id, companies(id, name)")
      .eq("user_id", userId);
    
    if (error) {
      logger.error("Error fetching user companies", error);
      return [];
    }
    
    return (data || [])
      .filter((item: any) => item.companies)
      .map((item: any) => ({
        id: item.companies.id,
        name: item.companies.name
      }));
  } catch (error) {
    logger.error("Error in getUserCompanies", error);
    return [];
  }
};
