/**
 * Tokens de design partagés entre :
 *  - le renderer PDF jsPDF impératif (`renderInvoiceEditorial.ts`)
 *  - l'aperçu HTML/CSS in-app (`InvoicePreview.tsx`)
 *
 * jsPDF travaille en millimètres et en RGB (tableau [r, g, b]).
 * Pour le HTML on expose les mêmes valeurs en hex.
 *
 * Mots-clés DA : éditorial, calme, premium, lisible.
 * Pas de gradients, pas d'aplat plein. La couleur d'accent est utilisée
 * avec parcimonie (numéro facture, total TTC, filet principal).
 */

export const PDF_PAGE = {
  /** A4 portrait en millimètres */
  widthMm: 210,
  heightMm: 297,
  /** Marges généreuses : 20 mm horizontal, 24 mm vertical */
  marginXMm: 20,
  marginYMm: 24,
} as const;

export const PDF_COLORS_HEX = {
  ink: "#0A0A0A",
  label: "#525252",
  muted: "#737373",
  line: "#E5E5E5",
  bg: "#FFFFFF",
  altRow: "#FAFAFA",
  defaultAccent: "#0F172A",
} as const;

export type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

export const PDF_COLORS = {
  ink: hexToRgb(PDF_COLORS_HEX.ink),
  label: hexToRgb(PDF_COLORS_HEX.label),
  muted: hexToRgb(PDF_COLORS_HEX.muted),
  line: hexToRgb(PDF_COLORS_HEX.line),
  bg: hexToRgb(PDF_COLORS_HEX.bg),
  altRow: hexToRgb(PDF_COLORS_HEX.altRow),
  defaultAccent: hexToRgb(PDF_COLORS_HEX.defaultAccent),
} as const;

/**
 * Convertit une couleur d'accent (hex) en RGB.
 * Si invalide ou absente, retourne la couleur par défaut.
 */
export function resolveAccent(hex?: string | null): RGB {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex.trim())) return PDF_COLORS.defaultAccent;
  return hexToRgb(hex.trim());
}

/**
 * Tailles en POINTS (jsPDF setFontSize)
 *  - 1 pt = 0.3528 mm
 *  - corps PDF cible : 10 pt (équivalent 13 px écran à 96 dpi)
 */
export const PDF_FONT_SIZE = {
  xs: 8, // mentions légales, footer
  sm: 9, // labels, secondaire
  base: 10, // corps principal
  md: 11, // titres de section
  lg: 14, // numéro de facture
  xl: 22, // total TTC
  xxl: 26, // fallback nom entreprise si pas de logo
} as const;

export const PDF_FONT_WEIGHT = {
  regular: "normal",
  bold: "bold",
} as const;

/**
 * Tokens HTML pour le composant `<InvoicePreview />` (pixels, ratio 1:1
 * avec les valeurs PDF — A4 = 794×1123 px à 96 dpi).
 */
export const HTML_PAGE_PX = {
  width: 794,
  height: 1123,
  marginX: 76, // ≈ 20 mm
  marginY: 91, // ≈ 24 mm
} as const;

export const HTML_FONT_SIZE_PX = {
  xs: 10,
  sm: 12,
  base: 13,
  md: 15,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;
