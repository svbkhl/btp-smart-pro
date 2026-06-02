/**
 * Système de thème PDF par tenant.
 * Un thème définit l'habillage visuel (couleurs, polices, flags comportementaux).
 * Les données et calculs restent identiques pour tous les thèmes.
 */

export type RGB = [number, number, number];

export interface PdfThemeColors {
  /** Fond bannière, en-tête tableau, bloc total */
  primary: RGB;
  /** Pied de page (version plus foncée) */
  primaryDeep: RGB;
  /** Accent coloré (liseré, puces, soulignement) */
  accent: RGB;
  /** Second accent (sous-ligne "DEVIS", bordure bloc client) */
  accent2: RGB;
  /** Texte principal */
  ink: RGB;
  /** Texte secondaire */
  muted: RGB;
  /** Bordures légères */
  line: RGB;
  /** Fonds clairs (lignes paires, blocs conditions) */
  soft: RGB;
  /** Texte sur fond coloré (bannière) */
  onPrimary: RGB;
}

export interface PdfThemeFonts {
  /** Police des titres et montants clés */
  title: string;
  /** Police du corps de texte */
  body: string;
  /** Police mono (numéros de référence) */
  mono?: string;
  /** Famille fallback si les polices custom ne chargent pas */
  fallback: string;
}

export interface PdfTheme {
  id: string;
  colors: PdfThemeColors;
  fonts: PdfThemeFonts;
  /**
   * Si true : la ligne "Matériel fourni par le client" (total_ht=0, unit_price_ht=null)
   * est retirée du tableau et affichée dans le bloc conditions en bas.
   */
  materialClauseInFooter: boolean;
  /**
   * Conditions de règlement spécifiques au thème.
   * Si null, on utilise les `terms_and_conditions` de UserSettings ou le texte par défaut.
   */
  conditions: string[] | null;
}
