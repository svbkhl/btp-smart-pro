import { defaultTheme } from "./default";
import { eauperationTheme } from "./eauperation";
import type { PdfTheme } from "./types";

export type { PdfTheme };
export { defaultTheme, eauperationTheme };

/**
 * IDs des company_id pour lesquels un thème custom est défini.
 * Mapping explicite : pas de lookup par nom (qui peut changer).
 */
const THEME_MAP: Record<string, PdfTheme> = {
  "341b894d-9d8e-48fb-b5bb-e914028844cc": eauperationTheme,
};

/**
 * Retourne le thème PDF correspondant au tenant.
 * Si aucun thème custom n'est trouvé, retourne le thème par défaut.
 */
export function getTheme(companyId?: string | null): PdfTheme {
  if (companyId && THEME_MAP[companyId]) {
    return THEME_MAP[companyId]!;
  }
  return defaultTheme;
}
