/**
 * Utilitaires de calcul de prix - MODE TTC FIRST
 * 
 * RÈGLE MÉTIER FONDAMENTALE:
 * Le prix saisi par l'entreprise est TOUJOURS un prix TTC.
 * La TVA est calculée pour information uniquement, JAMAIS ajoutée.
 */

/**
 * Arrondit un nombre à 2 décimales
 */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcule HT et TVA à partir d'un prix TTC
 * 
 * LOGIQUE:
 * - Prix TTC (saisi) = prix de référence
 * - TVA = prixTTC × (tauxTVA / (100 + tauxTVA))
 * - Prix HT = prixTTC − TVA
 * 
 * Exemple avec 2000€ TTC et 20% de TVA:
 * - TVA = 2000 × (20 / 120) = 333,33 €
 * - HT = 2000 - 333,33 = 1666,67 €
 * - TTC = 2000 € (inchangé)
 * 
 * @param ttc - Montant TTC saisi (source de vérité)
 * @param vatRate - Taux de TVA en pourcentage (ex: 20 pour 20%)
 * @returns Object avec total_ttc, total_ht, vat_amount
 */
export function calculateFromTTC(ttc: number, vatRate: number = 20) {
  // Validation
  if (ttc < 0) {
    throw new Error('Le montant TTC ne peut pas être négatif');
  }
  if (vatRate < 0 || vatRate > 100) {
    throw new Error('Le taux de TVA doit être entre 0 et 100');
  }

  // Calcul de la TVA contenue dans le prix TTC
  const vat = ttc * (vatRate / (100 + vatRate));
  
  // Calcul du HT
  const ht = ttc - vat;

  return {
    total_ttc: ttc,              // ⚠️ TTC = source de vérité (JAMAIS arrondi)
    total_ht: round(ht),         // Prix HT (calculé et arrondi)
    vat_amount: round(vat),      // Montant TVA (calculé et arrondi)
    vat_rate: vatRate,           // Taux TVA (pour référence)
  };
}

/**
 * Formate un montant en euros
 */
export function formatEuro(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
}

/**
 * Calcule le montant TTC pour Stripe (en centimes)
 * 
 * @param ttc - Montant TTC en euros
 * @returns Montant en centimes pour Stripe
 */
export function toStripeCents(ttc: number): number {
  return Math.round(ttc * 100);
}

/**
 * Convertit des centimes Stripe en euros TTC
 * 
 * @param cents - Montant en centimes
 * @returns Montant en euros
 */
export function fromStripeCents(cents: number): number {
  return cents / 100;
}

/**
 * Vérifie si un montant TTC est cohérent
 */
export function isValidTTC(ttc: number): boolean {
  return ttc > 0 && isFinite(ttc) && !isNaN(ttc);
}

/**
 * Exemple d'utilisation:
 * 
 * const prices = calculateFromTTC(2000, 20);
 * console.log(prices);
 * // {
 * //   total_ttc: 2000.00,
 * //   total_ht: 1666.67,
 * //   vat_amount: 333.33,
 * //   vat_rate: 20
 * // }
 */
