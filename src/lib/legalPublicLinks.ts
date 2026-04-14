/** Liens pages légales publiques (accueil, etc.) — ouverture nouvel onglet côté UI */

export const LEGAL_PUBLIC_PATHS = {
  confidentialite: "/legal/politique-confidentialite",
  mentionsLegales: "/legal/mentions-legales",
  conditionsGenerales: "/legal/conditions-generales",
} as const;

export function legalAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}
