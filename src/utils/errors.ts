/**
 * Système de gestion d'erreurs standardisé
 * 
 * Centralise toute la logique de gestion d'erreurs avec :
 * - Classes d'erreurs typées
 * - Transformation des erreurs Supabase
 * - Messages d'erreur en français pour l'utilisateur
 */

import { PostgrestError } from "@supabase/supabase-js";
import { logger } from "./logger";

/**
 * Types d'erreurs applicatives
 */
export type AppErrorType = 
  | 'AUTH'           // Erreurs d'authentification
  | 'PERMISSION'     // Erreurs de permissions / isolation multi-tenant
  | 'NOT_FOUND'      // Ressource introuvable
  | 'VALIDATION'     // Erreurs de validation de données
  | 'NETWORK'        // Erreurs réseau / timeout
  | 'DATABASE'       // Erreurs base de données
  | 'UNKNOWN';       // Erreurs inconnues

/**
 * Classe d'erreur applicative typée
 */
export class AppError extends Error {
  readonly type: AppErrorType;
  readonly userMessage: string;
  readonly technicalMessage?: string;
  readonly originalError?: Error;

  constructor(
    type: AppErrorType,
    userMessage: string,
    technicalMessage?: string,
    originalError?: Error
  ) {
    super(userMessage);
    this.name = 'AppError';
    this.type = type;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
    this.originalError = originalError;

    // Log l'erreur pour le debugging
    logger.error(`[${type}] ${userMessage}`, {
      technicalMessage,
      originalError: originalError?.message,
    });
  }
}

/**
 * Transforme une erreur Supabase en AppError
 * 
 * @param error - Erreur Supabase (PostgrestError)
 * @param context - Contexte de l'erreur (ex: "création de client")
 * @returns AppError typée avec message utilisateur approprié
 */
export function handleSupabaseError(
  error: PostgrestError | Error | unknown,
  context: string = "l'opération"
): AppError {
  // Si c'est déjà une AppError, la retourner telle quelle
  if (error instanceof AppError) {
    return error;
  }

  // Si c'est une erreur Supabase (PostgrestError)
  if (isPostgrestError(error)) {
    const code = error.code;
    const message = error.message.toLowerCase();

    // Erreurs d'authentification
    if (code === 'PGRST301' || message.includes('jwt') || message.includes('token')) {
      return new AppError(
        'AUTH',
        'Votre session a expiré. Veuillez vous reconnecter.',
        error.message,
        error as Error
      );
    }

    // Erreurs de permissions / RLS
    if (code === 'PGRST116' || code === '42501' || message.includes('permission') || message.includes('policy')) {
      logger.security('Permission denied error detected', { error, context });
      return new AppError(
        'PERMISSION',
        'Vous n\'avez pas la permission d\'effectuer cette action.',
        error.message,
        error as Error
      );
    }

    // Erreurs de ressource introuvable
    if (code === 'PGRST116' || code === '404' || message.includes('not found') || message.includes('does not exist')) {
      return new AppError(
        'NOT_FOUND',
        `La ressource demandée n'existe pas ou n'est plus disponible.`,
        error.message,
        error as Error
      );
    }

    // Erreurs de validation / contraintes
    if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
      return new AppError(
        'VALIDATION',
        'Cette ressource existe déjà. Veuillez utiliser un nom différent.',
        error.message,
        error as Error
      );
    }

    if (code === '23503' || message.includes('foreign key')) {
      return new AppError(
        'VALIDATION',
        'Cette action ne peut pas être effectuée car des éléments liés existent encore.',
        error.message,
        error as Error
      );
    }

    if (code === '23502' || message.includes('null value') || message.includes('not-null')) {
      return new AppError(
        'VALIDATION',
        'Tous les champs obligatoires doivent être remplis.',
        error.message,
        error as Error
      );
    }

    if (code === '23514' || message.includes('check constraint')) {
      return new AppError(
        'VALIDATION',
        'Les données fournies ne respectent pas les règles de validation.',
        error.message,
        error as Error
      );
    }

    // Erreurs de type UUID invalide
    if (message.includes('invalid input syntax for type uuid')) {
      return new AppError(
        'VALIDATION',
        'Les données fournies sont invalides.',
        error.message,
        error as Error
      );
    }

    // Autres erreurs de base de données
    return new AppError(
      'DATABASE',
      `Erreur lors de ${context}. Veuillez réessayer.`,
      error.message,
      error as Error
    );
  }

  // Erreurs réseau / timeout
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      return new AppError(
        'NETWORK',
        'Problème de connexion. Vérifiez votre connexion internet et réessayez.',
        error.message,
        error
      );
    }

    // Erreur générique avec message personnalisé
    return new AppError(
      'UNKNOWN',
      `Une erreur est survenue lors de ${context}.`,
      error.message,
      error
    );
  }

  // Erreur totalement inconnue
  return new AppError(
    'UNKNOWN',
    `Une erreur inattendue est survenue lors de ${context}.`,
    String(error)
  );
}

/**
 * Type guard pour vérifier si une erreur est une PostgrestError
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Affiche un toast d'erreur approprié
 * 
 * @param error - Erreur à afficher
 * @param toast - Fonction toast de shadcn/ui
 */
export function showErrorToast(
  error: unknown,
  toast: (params: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
): void {
  const appError = error instanceof AppError 
    ? error 
    : handleSupabaseError(error, "l'opération");

  // Log de sécurité pour les erreurs de permissions
  if (appError.type === 'PERMISSION') {
    logger.security('Permission error shown to user', {
      errorType: appError.type,
      userMessage: appError.userMessage,
    });
  }

  // Titre du toast selon le type d'erreur
  const titles: Record<AppErrorType, string> = {
    AUTH: 'Session expirée',
    PERMISSION: 'Accès refusé',
    NOT_FOUND: 'Introuvable',
    VALIDATION: 'Données invalides',
    NETWORK: 'Problème de connexion',
    DATABASE: 'Erreur serveur',
    UNKNOWN: 'Erreur',
  };

  toast({
    title: titles[appError.type] || 'Erreur',
    description: appError.userMessage,
    variant: 'destructive',
  });
}

/**
 * Crée une erreur de validation personnalisée
 */
export function createValidationError(message: string, technicalMessage?: string): AppError {
  return new AppError('VALIDATION', message, technicalMessage);
}

/**
 * Crée une erreur de permission personnalisée
 */
export function createPermissionError(message: string, technicalMessage?: string): AppError {
  logger.security('Permission error created', { message, technicalMessage });
  return new AppError('PERMISSION', message, technicalMessage);
}

/**
 * Crée une erreur d'authentification personnalisée
 */
export function createAuthError(message: string, technicalMessage?: string): AppError {
  return new AppError('AUTH', message, technicalMessage);
}

/**
 * Crée une erreur "not found" personnalisée
 */
export function createNotFoundError(resourceType: string): AppError {
  return new AppError(
    'NOT_FOUND',
    `${resourceType} introuvable ou inaccessible.`,
    `${resourceType} not found`
  );
}
