/**
 * Validation centralisée pour Edge Functions
 * Utilise Zod pour valider les inputs de manière stricte
 */

import { z } from "https://esm.sh/zod@3.22.4";

// ============================================
// Schemas de validation communs
// ============================================

/**
 * Validation d'email stricte
 */
export const emailSchema = z
  .string()
  .email("Email invalide")
  .toLowerCase()
  .trim()
  .max(255, "Email trop long");

/**
 * Validation d'UUID
 */
export const uuidSchema = z.string().uuid("UUID invalide");

/**
 * Validation de chaîne non vide
 */
export const nonEmptyStringSchema = z
  .string()
  .min(1, "Champ requis")
  .trim();

/**
 * Validation de nombre positif
 */
export const positiveNumberSchema = z
  .number()
  .positive("Doit être positif")
  .or(z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      throw new Error("Doit être un nombre positif");
    }
    return num;
  }));

/**
 * Validation de date ISO
 */
export const dateISOSchema = z.string().datetime("Date invalide");

/**
 * Validation d'URL
 */
export const urlSchema = z.string().url("URL invalide");

// ============================================
// Schemas pour Edge Functions spécifiques
// ============================================

/**
 * Schema pour send-invitation
 */
export const sendInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'member']).optional(),
  companyId: uuidSchema.optional(),
});

/**
 * Schema pour generate-quote
 */
export const generateQuoteSchema = z.object({
  clientName: nonEmptyStringSchema.max(255),
  surface: positiveNumberSchema,
  workType: nonEmptyStringSchema.max(255),
  materials: z.array(nonEmptyStringSchema).min(1, "Au moins un matériau requis"),
  description: z.string().optional(),
  location: z.string().optional(),
});

/**
 * Schema pour les requêtes avec auth token
 */
export const authenticatedRequestSchema = z.object({
  authorization: z.string().regex(/^Bearer .+/, "Token invalide"),
});

// ============================================
// Helpers de validation
// ============================================

/**
 * Valide les données d'une requête avec un schema Zod
 * Retourne un objet avec success, data et error
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join(".")}: ${firstError.message}`,
      };
    }
    return {
      success: false,
      error: "Erreur de validation",
    };
  }
}

/**
 * Valide et sanitize une chaîne de caractères
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }
  return input.trim().slice(0, maxLength);
}

/**
 * Valide un email et le normalise
 */
export function validateAndNormalizeEmail(email: unknown): string {
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    throw new Error("Email invalide");
  }
  return result.data;
}



