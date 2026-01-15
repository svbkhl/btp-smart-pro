/**
 * =====================================================
 * MOTEUR DE CALCUL DEVIS - CENTRALISÉ ET TESTABLE
 * =====================================================
 * Calculs cohérents pour lignes et devis complets
 * Gestion arrondis : 2 décimales, règle unique
 * =====================================================
 */

export interface QuoteLine {
  id?: string;
  quantity: number | null;
  unit_price_ht: number | null;
  tva_rate: number;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
}

export interface QuoteTotals {
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
}

/**
 * Arrondit un nombre à 2 décimales
 */
export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcule les totaux d'une ligne de devis
 * @param line - Ligne avec quantity, unit_price_ht, tva_rate
 * @returns Totaux calculés (total_ht, total_tva, total_ttc)
 */
export function computeLineTotals(line: QuoteLine): {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
} {
  const quantity = line.quantity ?? 0;
  const unitPrice = line.unit_price_ht ?? 0;
  const tvaRate = line.tva_rate ?? 0;

  // Total HT = quantité * prix unitaire
  const totalHt = roundTo2Decimals(quantity * unitPrice);

  // TVA = total HT * taux TVA
  const totalTva = roundTo2Decimals(totalHt * tvaRate);

  // Total TTC = total HT + TVA
  const totalTtc = roundTo2Decimals(totalHt + totalTva);

  return {
    total_ht: totalHt,
    total_tva: totalTva,
    total_ttc: totalTtc,
  };
}

/**
 * Calcule les totaux d'un devis complet depuis ses lignes
 * @param lines - Tableau de lignes de devis
 * @param defaultTvaRate - Taux TVA par défaut si ligne n'a pas de taux
 * @returns Totaux du devis (subtotal_ht, total_tva, total_ttc)
 */
export function computeQuoteTotals(
  lines: QuoteLine[],
  defaultTvaRate: number = 0.20
): QuoteTotals {
  let subtotalHt = 0;
  let totalTva = 0;
  let totalTtc = 0;

  for (const line of lines) {
    // Utiliser le taux TVA de la ligne ou le taux par défaut
    const lineWithTva = {
      ...line,
      tva_rate: line.tva_rate ?? defaultTvaRate,
    };

    const lineTotals = computeLineTotals(lineWithTva);

    subtotalHt += lineTotals.total_ht;
    totalTva += lineTotals.total_tva;
    totalTtc += lineTotals.total_ttc;
  }

  // Arrondir les totaux finaux
  return {
    subtotal_ht: roundTo2Decimals(subtotalHt),
    total_tva: roundTo2Decimals(totalTva),
    total_ttc: roundTo2Decimals(totalTtc),
  };
}

/**
 * Valide qu'une ligne de devis est complète
 */
export function validateQuoteLine(line: Partial<QuoteLine>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!line.label || line.label.trim() === '') {
    errors.push('Le libellé de la ligne est requis');
  }

  if (line.quantity !== null && line.quantity !== undefined && line.quantity < 0) {
    errors.push('La quantité ne peut pas être négative');
  }

  if (line.unit_price_ht !== null && line.unit_price_ht !== undefined && line.unit_price_ht < 0) {
    errors.push('Le prix unitaire ne peut pas être négatif');
  }

  if (line.tva_rate !== undefined && (line.tva_rate < 0 || line.tva_rate > 1)) {
    errors.push('Le taux TVA doit être entre 0 et 1 (0% à 100%)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un taux TVA en pourcentage
 */
export function formatTvaRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}
