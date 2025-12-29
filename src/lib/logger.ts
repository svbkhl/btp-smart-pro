/**
 * Logger centralisé pour le frontend
 * Remplace console.log avec des niveaux de log et filtrage en production
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const IS_PRODUCTION = import.meta.env.PROD;
const LOG_LEVEL: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || "info";

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
 * Logger avec contexte
 */
export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (shouldLog("info")) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string, error?: unknown, ...args: unknown[]) => {
    if (shouldLog("error")) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, name: error.name, stack: IS_PRODUCTION ? undefined : error.stack }
        : error;
      console.error(`[ERROR] ${message}`, errorDetails, ...args);
    }
  },
};

/**
 * Remplace console.log par logger.info en développement
 * Supprime les logs en production
 */
if (IS_PRODUCTION) {
  // En production, supprimer console.log
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
}



