/**
 * =====================================================
 * RÉSOLUTION DE PRIX - ORDRE DE PRIORITÉ PRO
 * =====================================================
 * 
 * ORDRE DE PRIORITÉ (NON NÉGOCIABLE) :
 * 1) Prix déjà utilisé par l'entreprise (bibliothèque)
 * 2) Catalogue interne de prix moyens
 * 3) Estimation IA (fallback uniquement)
 * 4) Validation / modification manuelle par l'utilisateur
 * 
 * Aucune estimation ne doit être recalculée automatiquement
 * sans action utilisateur.
 * =====================================================
 */

import { supabase } from "@/integrations/supabase/client";
import { getCompanyIdForUser } from "./companyHelpers";

export type PriceSource = "library" | "catalog" | "ai_estimate" | "manual";

export interface ResolvedPrice {
  price: number | null;
  source: PriceSource;
  sourceDetails?: {
    libraryItemId?: string;
    catalogItemId?: string;
    catalogItem?: any;
  };
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
 * Normalise un label pour recherche dans la bibliothèque
 */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Résout le prix d'une ligne selon l'ordre de priorité PRO
 * 
 * @param label - Libellé de la ligne
 * @param category - Catégorie (labor, material, service, other)
 * @param unit - Unité (m2, ml, h, u, forfait)
 * @param userId - ID de l'utilisateur (pour récupérer company_id)
 * @param existingLibraryPrice - Prix existant dans la bibliothèque (si déjà connu)
 * @returns Prix résolu avec sa source
 */
export async function resolveLinePrice(
  label: string,
  category: "labor" | "material" | "service" | "other" | null,
  unit: string | null,
  userId: string,
  existingLibraryPrice?: number | null
): Promise<ResolvedPrice> {
  // ============================================
  // 1) PRIORITÉ 1 : BIBLIOTHÈQUE (prix déjà utilisé par l'entreprise)
  // ============================================
  if (existingLibraryPrice !== undefined && existingLibraryPrice !== null) {
    return {
      price: existingLibraryPrice,
      source: "library",
      sourceDetails: {},
    };
  }

  // Chercher dans la bibliothèque
  try {
    const companyId = await getCompanyIdForUser(userId);
    if (companyId) {
      const labelNormalized = normalizeLabel(label);
      const { data: libraryItem } = await supabase
        .from("quote_line_library")
        .select("*")
        .eq("company_id", companyId)
        .eq("label_normalized", labelNormalized)
        .maybeSingle();

      if (libraryItem?.default_unit_price_ht) {
        return {
          price: libraryItem.default_unit_price_ht,
          source: "library",
          sourceDetails: {
            libraryItemId: libraryItem.id,
          },
        };
      }
    }
  } catch (error) {
    console.warn("Error checking library for price:", error);
    // Continue avec les autres sources
  }

  // ============================================
  // 2) PRIORITÉ 2 : CATALOGUE INTERNE (prix moyens de référence)
  // ============================================
  // Uniquement pour les matériaux
  if (category === "material" && unit) {
    try {
      const companyId = await getCompanyIdForUser(userId);
      const materialKey = normalizeMaterialKey(label);

      // Chercher d'abord dans le catalogue de l'entreprise
      if (companyId) {
        const { data: companyPrice } = await supabase
          .from("materials_price_catalog")
          .select("*")
          .eq("company_id", companyId)
          .eq("material_key", materialKey)
          .eq("unit", unit)
          .maybeSingle();

        if (companyPrice?.avg_unit_price_ht) {
          return {
            price: companyPrice.avg_unit_price_ht,
            source: "catalog",
            sourceDetails: {
              catalogItemId: companyPrice.id,
              catalogItem: companyPrice,
            },
          };
        }
      }

      // Fallback sur catalogue global
      const { data: globalPrice } = await supabase
        .from("materials_price_catalog")
        .select("*")
        .is("company_id", null)
        .eq("material_key", materialKey)
        .eq("unit", unit)
        .maybeSingle();

      if (globalPrice?.avg_unit_price_ht) {
        return {
          price: globalPrice.avg_unit_price_ht,
          source: "catalog",
          sourceDetails: {
            catalogItemId: globalPrice.id,
            catalogItem: globalPrice,
          },
        };
      }
    } catch (error) {
      console.warn("Error checking catalog for price:", error);
      // Continue avec les autres sources
    }
  }

  // ============================================
  // 3) PRIORITÉ 3 : ESTIMATION IA (FALLBACK UNIQUEMENT)
  // ============================================
  // L'IA ne doit JAMAIS être la source principale
  // Elle sert uniquement de fallback si bibliothèque et catalogue n'ont rien
  // Pour l'instant, on retourne null pour forcer la saisie manuelle
  // L'estimation IA sera faite côté Edge Function si nécessaire

  // Estimation basique par défaut selon l'unité (très conservatrice)
  // Ces valeurs sont indicatives et doivent être validées par l'utilisateur
  if (unit) {
    const defaultEstimates: Record<string, number> = {
      m2: 20.0,   // Prix moyen indicatif m²
      ml: 15.0,   // Prix moyen indicatif ml
      u: 10.0,    // Prix moyen indicatif unité
      kg: 5.0,    // Prix moyen indicatif kg
      h: 50.0,    // Prix moyen indicatif heure (main d'œuvre)
      forfait: 100.0, // Prix moyen indicatif forfait
    };

    const estimatedPrice = defaultEstimates[unit] || 10.0;
    
    return {
      price: estimatedPrice,
      source: "ai_estimate",
      sourceDetails: {},
    };
  }

  // ============================================
  // 4) PRIORITÉ 4 : MANUEL (par défaut)
  // ============================================
  // Si aucune source n'a fourni de prix, retourner null
  // L'utilisateur devra saisir manuellement
  return {
    price: null,
    source: "manual",
    sourceDetails: {},
  };
}

/**
 * Résout le prix depuis la bibliothèque uniquement
 * (utilisé quand on ajoute une ligne depuis la bibliothèque)
 */
export async function resolvePriceFromLibrary(
  libraryItemId: string,
  userId: string
): Promise<ResolvedPrice | null> {
  try {
    const companyId = await getCompanyIdForUser(userId);
    if (!companyId) return null;

    const { data: libraryItem } = await supabase
      .from("quote_line_library")
      .select("*")
      .eq("id", libraryItemId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (libraryItem?.default_unit_price_ht) {
      return {
        price: libraryItem.default_unit_price_ht,
        source: "library",
        sourceDetails: {
          libraryItemId: libraryItem.id,
        },
      };
    }

    // Si pas de prix dans la bibliothèque, chercher dans le catalogue
    if (libraryItem?.default_category === "material" && libraryItem?.default_unit) {
      return await resolveLinePrice(
        libraryItem.label,
        libraryItem.default_category,
        libraryItem.default_unit,
        userId,
        null // Pas de prix library connu
      );
    }

    return null;
  } catch (error) {
    console.warn("Error resolving price from library:", error);
    return null;
  }
}
