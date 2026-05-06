/**
 * Régime de TVA d'une entreprise BTP française.
 *
 * - STANDARD          : régime réel/simplifié, TVA collectée 20 % (5,5/10 % selon prestation).
 * - FRANCHISE_293B    : franchise en base de TVA (art. 293 B CGI), pas de TVA, mention obligatoire.
 * - AUTOLIQUIDATION_BTP : sous-traitance bâtiment (art. 283-2 nonies CGI), TVA due par le preneur.
 *
 * Stocké sur `user_settings.vat_regime` (état courant de l'entreprise) et
 * snapshotté sur `invoices.vat_regime` au moment de l'émission de la facture
 * (immutable une fois la facture créée).
 */
export type VatRegime = "STANDARD" | "FRANCHISE_293B" | "AUTOLIQUIDATION_BTP";

export const VAT_REGIMES: VatRegime[] = ["STANDARD", "FRANCHISE_293B", "AUTOLIQUIDATION_BTP"];

export const VAT_REGIME_LABEL: Record<VatRegime, string> = {
  STANDARD: "Régime réel — TVA collectée",
  FRANCHISE_293B: "Franchise en base de TVA (art. 293 B CGI)",
  AUTOLIQUIDATION_BTP: "Autoliquidation BTP (art. 283-2 nonies CGI)",
};

export const VAT_LEGAL_MENTION: Record<VatRegime, string | null> = {
  STANDARD: null,
  FRANCHISE_293B: "TVA non applicable, art. 293 B du CGI.",
  AUTOLIQUIDATION_BTP: "Autoliquidation — TVA due par le preneur (art. 283-2 nonies CGI).",
};

/**
 * Renvoie la mention légale exacte à imprimer sur la facture, ou null si rien
 * à mentionner (régime standard).
 */
export function resolveVatLegalMention(regime: VatRegime | null | undefined): string | null {
  if (!regime) return null;
  return VAT_LEGAL_MENTION[regime] ?? null;
}

/**
 * Renvoie true si le régime impose un taux TVA effectif à 0.
 */
export function isZeroVatRegime(regime: VatRegime | null | undefined): boolean {
  return regime === "FRANCHISE_293B" || regime === "AUTOLIQUIDATION_BTP";
}

/**
 * Calcule le taux TVA effectif à appliquer compte tenu du régime + taux saisi.
 * - Franchise 293 B / Autoliquidation BTP → 0
 * - Sinon → taux saisi (ex. 0.20 pour 20 %)
 */
export function effectiveVatRate(regime: VatRegime | null | undefined, requestedRate: number): number {
  if (isZeroVatRegime(regime)) return 0;
  return requestedRate;
}

/**
 * Représente l'état d'un devis source (au moment où il a été créé).
 */
export interface QuoteVatState {
  tva_non_applicable_293b?: boolean | null;
  tva_rate?: number | null;
}

/**
 * Représente le régime courant de l'entreprise au moment de la conversion.
 */
export interface CompanyVatState {
  vat_regime?: VatRegime | null;
}

export interface VatMismatchInfo {
  hasMismatch: boolean;
  quoteRegime: VatRegime;
  companyRegime: VatRegime;
  /** Message FR à afficher dans la modal d'avertissement bloquante. */
  message: string | null;
}

/**
 * Compare le régime du devis source au régime courant de l'entreprise.
 * Si écart → message d'avertissement à montrer en modal bloquante avant
 * conversion devis → facture.
 */
export function detectVatRegimeMismatch(
  quote: QuoteVatState | null | undefined,
  company: CompanyVatState | null | undefined
): VatMismatchInfo {
  const quoteRegime: VatRegime = quote?.tva_non_applicable_293b ? "FRANCHISE_293B" : "STANDARD";
  const companyRegime: VatRegime = company?.vat_regime ?? "STANDARD";

  const hasMismatch = quoteRegime !== companyRegime;

  let message: string | null = null;
  if (hasMismatch) {
    message =
      `Le régime TVA de votre entreprise a changé depuis l'émission du devis ` +
      `(devis : ${VAT_REGIME_LABEL[quoteRegime]} → entreprise : ${VAT_REGIME_LABEL[companyRegime]}). ` +
      `La facture sera générée selon le régime actuel de l'entreprise. Continuer ?`;
  }

  return { hasMismatch, quoteRegime, companyRegime, message };
}

/**
 * Calcule les totaux finaux d'une facture en respectant strictement le régime.
 * - franchise / autoliquidation → TVA forcée à 0, TTC = HT, mention légale renseignée.
 * - standard → recalcul classique.
 *
 * Tout est en NUMBER (à arrondir 2 décimales). Pour basculer en centimes integer
 * (recommandé long terme), changer ce module sans toucher aux callers.
 */
export interface VatTotalsInput {
  totalHt: number;
  /** Taux saisi (ex. 0.20 pour 20%). Ignoré si régime à 0. */
  requestedRate: number;
  regime: VatRegime;
}

export interface VatTotalsOutput {
  totalHt: number;
  vatRate: number; // taux décimal effectif (0 ou requestedRate)
  vatAmount: number;
  totalTtc: number;
  legalMention: string | null;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeVatTotals(input: VatTotalsInput): VatTotalsOutput {
  const ht = r2(input.totalHt || 0);
  const rate = effectiveVatRate(input.regime, input.requestedRate ?? 0);
  const vatAmount = r2(ht * rate);
  const ttc = r2(ht + vatAmount);
  return {
    totalHt: ht,
    vatRate: rate,
    vatAmount,
    totalTtc: ttc,
    legalMention: resolveVatLegalMention(input.regime),
  };
}
