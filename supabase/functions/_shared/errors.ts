/**
 * Gestion centralisée des erreurs pour Edge Functions
 * Standardise les réponses d'erreur HTTP
 */

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Codes d'erreur standardisés
 */
export enum ErrorCode {
  // Erreurs de validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  
  // Erreurs d'authentification
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  
  // Erreurs de ressources
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  
  // Erreurs serveur
  INTERNAL_ERROR = "INTERNAL_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  
  // Erreurs de rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

/**
 * Crée une réponse d'erreur standardisée
 */
export function createErrorResponse(
  error: string,
  code?: ErrorCode,
  details?: unknown
): ErrorResponse {
  return {
    success: false,
    error,
    code: code || ErrorCode.INTERNAL_ERROR,
    ...(details && { details }),
  };
}

/**
 * Crée une réponse de succès standardisée
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Crée une réponse HTTP avec le bon status code
 */
export function createHttpResponse<T>(
  response: ApiResponse<T>,
  status?: number
): Response {
  const defaultStatus = response.success ? 200 : 500;
  const finalStatus = status || (response.success ? 200 : getStatusFromError(response));
  
  return new Response(JSON.stringify(response), {
    status: finalStatus,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Détermine le status HTTP à partir du code d'erreur
 */
function getStatusFromError(response: ErrorResponse): number {
  switch (response.code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_INPUT:
      return 400;
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.INVALID_TOKEN:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.ALREADY_EXISTS:
      return 409;
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 429;
    case ErrorCode.CONFIGURATION_ERROR:
      return 500;
    case ErrorCode.EXTERNAL_SERVICE_ERROR:
      return 502;
    default:
      return 500;
  }
}

/**
 * Wrapper pour gérer les erreurs dans les Edge Functions
 */
export async function handleEdgeFunctionError(
  error: unknown,
  context?: string
): Promise<Response> {
  // Log l'erreur (sans données sensibles)
  console.error(`❌ Error${context ? ` in ${context}` : ""}:`, {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "UnknownError",
  });

  // Ne pas exposer les détails de l'erreur en production
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Une erreur inattendue s'est produite";

  const errorResponse = createErrorResponse(
    errorMessage,
    ErrorCode.INTERNAL_ERROR
  );

  return createHttpResponse(errorResponse);
}



