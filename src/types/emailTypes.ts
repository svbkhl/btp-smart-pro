/**
 * Types pour les emails dans le système
 */

/**
 * Type d'email envoyé
 * - quote_sent: Email envoyé avec un devis (sans demande de signature)
 * - signature_request: Email avec demande de signature (devis ou facture)
 * - reminder: Email de rappel
 * - generic: Email générique (notification, etc.)
 */
export type EmailType = "quote_sent" | "signature_request" | "reminder" | "generic";

/**
 * Détermine le type d'email basé sur le contexte
 */
export function determineEmailType(params: {
  quote_id?: string | null;
  invoice_id?: string | null;
  hasSignatureLink?: boolean;
  providedType?: string;
}): EmailType {
  const { quote_id, invoice_id, hasSignatureLink, providedType } = params;

  // Si un type est fourni et qu'il est valide, l'utiliser
  if (providedType && ["quote_sent", "signature_request", "reminder", "generic"].includes(providedType)) {
    return providedType as EmailType;
  }

  // Si c'est une demande de signature (lien de signature présent)
  if (hasSignatureLink && (quote_id || invoice_id)) {
    return "signature_request";
  }

  // Si c'est un devis envoyé
  if (quote_id) {
    return "quote_sent";
  }

  // Si c'est une facture envoyée
  if (invoice_id) {
    return "signature_request"; // Par défaut, les factures sont souvent pour signature
  }

  // Par défaut
  return "generic";
}





