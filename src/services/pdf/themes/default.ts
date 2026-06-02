import type { PdfTheme } from "./types";

/**
 * Thème par défaut — noir/blanc/helvetica.
 * Pixel-identique au rendu existant avant l'introduction du système de thèmes.
 */
export const defaultTheme: PdfTheme = {
  id: "default",
  colors: {
    primary:     [30,  30,  30],   // Noir/anthracite bannière
    primaryDeep: [20,  20,  20],   // Noir pied de page
    accent:      [30,  30,  30],   // Même noir (pas d'accent coloré par défaut)
    accent2:     [30,  30,  30],
    ink:         [31,  41,  55],   // Gris foncé texte
    muted:       [100, 100, 100],  // Gris moyen labels
    line:        [200, 200, 200],  // Bordures légères
    soft:        [243, 244, 246],  // Fond lignes paires
    onPrimary:   [255, 255, 255],  // Blanc sur fond noir
  },
  fonts: {
    title:    "helvetica",
    body:     "helvetica",
    fallback: "helvetica",
  },
  materialClauseInFooter: false,
  conditions: null,
};
