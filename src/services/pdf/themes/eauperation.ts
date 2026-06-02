import type { PdfTheme } from "./types";

/**
 * Thème Eau'pération Sanitaire.
 * Navy / rouge / cyan — Archivo + Manrope.
 *
 * Identifié par company_id : 341b894d-9d8e-48fb-b5bb-e914028844cc
 */
export const eauperationTheme: PdfTheme = {
  id: "eauperation",
  colors: {
    primary:     [27,  58,  92],   // navy     #1B3A5C
    primaryDeep: [15,  36,  56],   // navyDeep #0F2438
    accent:      [224, 52,  43],   // red      #E0342B
    accent2:     [43,  183, 198],  // cyan     #2BB7C6
    ink:         [31,  42,  55],   // ink      #1f2a37
    muted:       [107, 119, 133],  // muted    #6b7785
    line:        [230, 234, 239],  // line     #e6eaef
    soft:        [244, 246, 249],  // soft     #f4f6f9
    onPrimary:   [255, 255, 255],
  },
  fonts: {
    title:    "Archivo",
    body:     "Manrope",
    mono:     "Archivo",
    fallback: "helvetica",
  },
  materialClauseInFooter: true,
  conditions: [
    "Acompte matériel : la totalité du matériel est réglée à la commande, avant le début des travaux.",
    "Solde : le solde des travaux est réglé à la livraison, en fin de chantier.",
    "Matériel fourni par le client : l'entreprise décline toute responsabilité quant à la qualité, la conformité, le fonctionnement ou les vices cachés du matériel fourni par le client. La garantie décennale et la garantie de parfait achèvement de l'entreprise ne s'appliqueront qu'à la main-d'œuvre (la pose) et exclusivement sur les éléments installés par nos soins.",
  ],
};

/** URL du logo tenant (chemin public). */
export const EAUPERATION_LOGO_URL = "/tenants/eauperation/logo.png";

/** Coordonnées complètes affichées dans la bannière. */
export const EAUPERATION_HEADER = {
  phone1: "06 28 82 10 60",
  phone2: "09 82 51 19 55",
  city:   "Plombier à Feigères — Haute-Savoie 74",
  stars:  "★ 5/5 Google",
  tagline: "Dépannage · Urgences 24h · Devis gratuit",
} as const;
