/**
 * Hook pour gérer le référentiel de prix des matériaux
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";
import { getCompanyIdForUser } from "@/utils/companyHelpers";

export interface MaterialsPriceCatalogItem {
  id: string;
  company_id?: string | null; // NULL = global
  material_key: string;
  material_name: string;
  unit: string;
  avg_unit_price_ht: number;
  min_unit_price_ht?: number | null;
  max_unit_price_ht?: number | null;
  source: "market" | "supplier" | "manual";
  updated_at: string;
  created_at: string;
}

export interface CreateMaterialPriceData {
  material_key: string;
  material_name: string;
  unit: string;
  avg_unit_price_ht: number;
  min_unit_price_ht?: number;
  max_unit_price_ht?: number;
  source?: "market" | "supplier" | "manual";
}

/**
 * Normalise une clé de matériau pour recherche
 */
function normalizeMaterialKey(material: string): string {
  return material
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Recherche un prix de matériau (company spécifique puis global)
 */
export const useGetMaterialPrice = (materialName: string) => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["materials_price", user?.id, materialName],
    queryFn: async () => {
      if (!user || !materialName.trim()) return null;

      const materialKey = normalizeMaterialKey(materialName);

      // Chercher d'abord dans les prix de l'entreprise
      if (companyId) {
        const { data: companyPrice } = await supabase
          .from("materials_price_catalog")
          .select("*")
          .eq("company_id", companyId)
          .eq("material_key", materialKey)
          .maybeSingle();

        if (companyPrice) {
          return companyPrice as MaterialsPriceCatalogItem;
        }
      }

      // Fallback sur prix global
      const { data: globalPrice } = await supabase
        .from("materials_price_catalog")
        .select("*")
        .is("company_id", null)
        .eq("material_key", materialKey)
        .maybeSingle();

      return globalPrice as MaterialsPriceCatalogItem | null;
    },
    enabled: !!user && materialName.trim().length > 0,
  });
};

/**
 * Estime le prix d'un matériau (recherche + fallback)
 */
export async function estimateMaterialPrice(
  materialName: string,
  unit: string,
  userId: string
): Promise<{ price: number; source: "catalog" | "estimate"; catalogItem?: MaterialsPriceCatalogItem }> {
  const companyId = await getCompanyIdForUser(userId);
  const materialKey = normalizeMaterialKey(materialName);

  // Chercher dans le catalogue
  if (companyId) {
    const { data: companyPrice } = await supabase
      .from("materials_price_catalog")
      .select("*")
      .eq("company_id", companyId)
      .eq("material_key", materialKey)
      .maybeSingle();

    if (companyPrice) {
      return {
        price: companyPrice.avg_unit_price_ht,
        source: "catalog",
        catalogItem: companyPrice as MaterialsPriceCatalogItem,
      };
    }
  }

  // Fallback global
  const { data: globalPrice } = await supabase
    .from("materials_price_catalog")
    .select("*")
    .is("company_id", null)
    .eq("material_key", materialKey)
    .maybeSingle();

  if (globalPrice) {
    return {
      price: globalPrice.avg_unit_price_ht,
      source: "catalog",
      catalogItem: globalPrice as MaterialsPriceCatalogItem,
    };
  }

  // Estimation basique par défaut (à améliorer avec IA si nécessaire)
  // Pour l'instant, retourner un prix par défaut selon l'unité
  const defaultPrices: Record<string, number> = {
    m2: 20.0,
    ml: 15.0,
    u: 10.0,
    kg: 5.0,
    h: 50.0,
  };

  return {
    price: defaultPrices[unit] || 10.0,
    source: "estimate",
  };
}

/**
 * Récupère tous les prix de matériaux (company + global)
 */
export const useMaterialsPriceCatalog = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["materials_price_catalog", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");


      // Récupérer prix company + global
      const queries = [];
      
      if (companyId) {
        queries.push(
          supabase
            .from("materials_price_catalog")
            .select("*")
            .eq("company_id", companyId)
        );
      }

      queries.push(
        supabase
          .from("materials_price_catalog")
          .select("*")
          .is("company_id", null)
      );

      const results = await Promise.all(queries);
      const allPrices: MaterialsPriceCatalogItem[] = [];

      for (const result of results) {
        if (result.data) {
          allPrices.push(...(result.data as MaterialsPriceCatalogItem[]));
        }
      }

      // Dédupliquer par material_key (priorité company)
      const uniquePrices = new Map<string, MaterialsPriceCatalogItem>();
      for (const price of allPrices) {
        if (!uniquePrices.has(price.material_key) || price.company_id) {
          uniquePrices.set(price.material_key, price);
        }
      }

      return Array.from(uniquePrices.values());
    },
    enabled: !!user,
  });
};

/**
 * Ajoute ou met à jour un prix de matériau
 */
export const useUpsertMaterialPrice = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (priceData: CreateMaterialPriceData) => {
      if (!user) throw new Error("User not authenticated");

      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      const materialKey = normalizeMaterialKey(priceData.material_key);

      const { data, error } = await supabase
        .from("materials_price_catalog")
        .upsert(
          {
            company_id: companyId,
            material_key: materialKey,
            material_name: priceData.material_name,
            unit: priceData.unit,
            avg_unit_price_ht: priceData.avg_unit_price_ht,
            min_unit_price_ht: priceData.min_unit_price_ht,
            max_unit_price_ht: priceData.max_unit_price_ht,
            source: priceData.source || "manual",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "company_id,material_key",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as MaterialsPriceCatalogItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials_price_catalog"] });
      queryClient.invalidateQueries({ queryKey: ["materials_price"] });
    },
  });
};
