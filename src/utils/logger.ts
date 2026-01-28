/**
 * Système de logging unifié pour l'application
 * 
 * Usage:
 * - logger.debug() : Logs de développement (désactivés en production)
 * - logger.error() : Erreurs critiques (toujours actifs)
 * - logger.security() : Événements de sécurité (toujours actifs)
 * - logger.info() : Informations importantes (toujours actifs)
 */

const isDevelopment = import.meta.env.DEV;

class Logger {
  /**
   * Logs de développement uniquement
   * Désactivés automatiquement en production
   */
  debug(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`🔍 [DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Informations importantes
   * Toujours actifs
   */
  info(message: string, data?: any) {
    console.log(`ℹ️ [INFO] ${message}`, data || '');
  }

  /**
   * Erreurs critiques
   * Toujours actifs
   */
  error(message: string, error?: any) {
    console.error(`❌ [ERROR] ${message}`, error || '');
    
    // En production, on pourrait envoyer à un service de monitoring
    // if (!isDevelopment) {
    //   // Sentry, LogRocket, etc.
    // }
  }

  /**
   * Événements de sécurité
   * Toujours actifs et tracés
   */
  security(message: string, data?: any) {
    console.warn(`🔒 [SECURITY] ${message}`, data || '');
    
    // En production, logger dans un système d'audit
    // if (!isDevelopment) {
    //   // Audit log service
    // }
  }

  /**
   * Avertissements
   * Toujours actifs
   */
  warn(message: string, data?: any) {
    console.warn(`⚠️ [WARN] ${message}`, data || '');
  }
}

export const logger = new Logger();
