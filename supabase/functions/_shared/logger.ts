/**
 * Logger centralisé pour Edge Functions
 * Remplace console.log avec des niveaux de log et filtrage en production
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  functionName?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

const LOG_LEVEL: LogLevel = (Deno.env.get("LOG_LEVEL") as LogLevel) || "info";
const IS_PRODUCTION = Deno.env.get("ENVIRONMENT") === "production";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Vérifie si un niveau de log doit être affiché
 */
function shouldLog(level: LogLevel): boolean {
  if (IS_PRODUCTION && level === "debug") {
    return false;
  }
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

/**
 * Formate un message de log avec contexte
 */
function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context
    ? ` [${Object.entries(context)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}]`
    : "";
  return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
}

/**
 * Logger avec contexte
 */
export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (shouldLog("debug")) {
      console.log(formatMessage("debug", message, context));
    }
  },

  info: (message: string, context?: LogContext) => {
    if (shouldLog("info")) {
      console.log(formatMessage("info", message, context));
    }
  },

  warn: (message: string, context?: LogContext) => {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, context));
    }
  },

  error: (message: string, error?: unknown, context?: LogContext) => {
    if (shouldLog("error")) {
      // Sérialiser l'erreur de manière plus détaillée
      let errorDetails: unknown;
      if (error instanceof Error) {
        errorDetails = {
          message: error.message,
          name: error.name,
          stack: IS_PRODUCTION ? undefined : error.stack,
        };
      } else if (error && typeof error === 'object') {
        // Pour les objets d'erreur Supabase, essayer de sérialiser toutes les propriétés
        try {
          errorDetails = {
            ...error,
            // Essayer d'extraire les propriétés communes
            message: (error as any).message || 'No message',
            code: (error as any).code || 'No code',
            status: (error as any).status || 'No status',
            name: (error as any).name || 'No name',
            // Sérialiser l'objet complet
            serialized: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          };
        } catch {
          errorDetails = String(error);
        }
      } else {
        errorDetails = String(error);
      }

      const errorContext = {
        ...context,
        error: errorDetails,
      };
      console.error(formatMessage("error", message, errorContext));
    }
  },
};



