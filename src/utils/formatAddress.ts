/**
 * Nettoyage d'adresse pour les documents (devis / factures).
 *
 * `stripBuildingUnit` retire les mentions de bâtiment / appartement / porte
 * ("Bât. B", "Appartement 12", "Porte 3", "Apt 4B", "Lot 7"...) tout en
 * conservant le numéro de rue et le reste de l'adresse.
 */

const UNIT_PATTERNS: RegExp[] = [
  // Bâtiment : "Bât A", "Bat. 3", "Bâtiment B2"
  /\b(?:b[âa]t(?:iment)?\.?)\s*(?:n[°o]\s*)?(?:\d{1,4}\s?[a-z]?|[a-z]\d{0,3})\b\.?/gi,
  // Appartement : "Appt 12", "Apt B", "Appartement 4B", "Appartement" seul
  /\b(?:appartement|appt\.?|apt\.?)\s*(?:n[°o]\s*)?(?:\d{1,4}\s?[a-z]?|[a-z]\b)?\.?/gi,
  // Porte / lot : uniquement suivis d'un numéro (pour ne pas toucher
  // "Porte de Versailles" ou "rue de la Porte Jaune")
  /\b(?:porte|lot)\s*(?:n[°o]\s*)?\d{1,4}\s?[a-z]?\b\.?/gi,
];

export function stripBuildingUnit(address?: string | null): string {
  if (!address) return "";
  let out = address;
  for (const pattern of UNIT_PATTERNS) {
    out = out.replace(pattern, " ");
  }
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*(?=,)/g, "")
    .replace(/^[\s,–—-]+|[\s,–—-]+$/g, "")
    .trim();
}
