/**
 * Système de numérotation automatique pour les devis et factures
 * Format: DEVIS-YYYY-XXX ou FACTURE-YYYY-XXX
 * Exemple: DEVIS-2024-001, FACTURE-2024-042
 */

import { supabase } from "@/integrations/supabase/client";

export type DocumentType = "DEVIS" | "FACTURE";

/**
 * Génère le prochain numéro de document
 * @param type Type de document (DEVIS ou FACTURE)
 * @param userId ID de l'utilisateur
 * @returns Numéro formaté (ex: DEVIS-2024-001)
 */
export async function generateDocumentNumber(
  type: DocumentType,
  userId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${type}-${year}-`;

  try {
    // Déterminer la table à interroger
    const tableName = type === "DEVIS" ? "ai_quotes" : "invoices";
    const numberField = type === "DEVIS" ? "quote_number" : "invoice_number";

    // Récupérer le dernier numéro de l'année en cours
    const { data, error } = await supabase
      .from(tableName)
      .select(numberField)
      .eq("user_id", userId)
      .like(numberField, `${prefix}%`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error && !error.message.includes("does not exist")) {
      console.error(`Erreur lors de la récupération du dernier numéro ${type}:`, error);
    }

    // Extraire le numéro du dernier document
    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0][numberField];
      if (lastNumber && lastNumber.startsWith(prefix)) {
        const lastSequence = parseInt(lastNumber.split("-")[2] || "0");
        nextNumber = lastSequence + 1;
      }
    }

    // Formater le numéro avec des zéros (ex: 001, 042, 123)
    const formattedNumber = nextNumber.toString().padStart(3, "0");
    return `${prefix}${formattedNumber}`;
  } catch (error) {
    console.error(`Erreur lors de la génération du numéro ${type}:`, error);
    // En cas d'erreur, générer un numéro par défaut basé sur le timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
}

/**
 * Génère un numéro de devis
 * @param userId ID de l'utilisateur
 * @returns Numéro formaté (ex: DEVIS-2024-001)
 */
export async function generateQuoteNumber(userId: string): Promise<string> {
  return generateDocumentNumber("DEVIS", userId);
}

/**
 * Génère un numéro de facture
 * @param userId ID de l'utilisateur
 * @returns Numéro formaté (ex: FACTURE-2024-001)
 */
export async function generateInvoiceNumber(userId: string): Promise<string> {
  return generateDocumentNumber("FACTURE", userId);
}

/**
 * Valide le format d'un numéro de document
 * @param number Numéro à valider
 * @param type Type de document attendu
 * @returns true si le format est valide
 */
export function validateDocumentNumber(
  number: string,
  type: DocumentType
): boolean {
  const regex = new RegExp(`^${type}-\\d{4}-\\d{3}$`);
  return regex.test(number);
}

/**
 * Extrait les informations d'un numéro de document
 * @param number Numéro de document
 * @returns Objet avec le type, l'année et le numéro de séquence
 */
export function parseDocumentNumber(number: string): {
  type: DocumentType | null;
  year: number | null;
  sequence: number | null;
} {
  const parts = number.split("-");
  if (parts.length !== 3) {
    return { type: null, year: null, sequence: null };
  }

  const type = parts[0] as DocumentType;
  const year = parseInt(parts[1]);
  const sequence = parseInt(parts[2]);

  if (
    (type !== "DEVIS" && type !== "FACTURE") ||
    isNaN(year) ||
    isNaN(sequence)
  ) {
    return { type: null, year: null, sequence: null };
  }

  return { type, year, sequence };
}

















