import { memo } from "react";
import { GlassCard as GlassCardOriginal } from "./GlassCard";

/**
 * Version mémorisée de GlassCard pour optimiser les performances
 * Évite les re-renderings inutiles quand les props ne changent pas
 */
export const GlassCard = memo(GlassCardOriginal);





