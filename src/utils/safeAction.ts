/**
 * Fonction utilitaire pour exécuter des actions de manière sécurisée
 * avec gestion automatique des erreurs, logs et notifications
 */

import { toast } from "@/components/ui/use-toast";

interface SafeActionOptions {
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  logError?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Exécute une fonction asynchrone de manière sécurisée
 * avec gestion automatique des erreurs et notifications
 * 
 * @param asyncFn - Fonction asynchrone à exécuter
 * @param options - Options de configuration
 * @returns Promise avec le résultat ou null en cas d'erreur
 * 
 * @example
 * ```ts
 * await safeAction(
 *   async () => await createProject(data),
 *   {
 *     successMessage: "Projet créé avec succès",
 *     errorMessage: "Erreur lors de la création du projet"
 *   }
 * );
 * ```
 */
export async function safeAction<T = any>(
  asyncFn: () => Promise<T>,
  options: SafeActionOptions = {}
): Promise<T | null> {
  const {
    successMessage,
    errorMessage = "Une erreur est survenue",
    showSuccessToast = true,
    showErrorToast = true,
    logError = true,
    onSuccess,
    onError,
  } = options;

  try {
    const result = await asyncFn();


    // Toast de succès
    if (successMessage && showSuccessToast) {
      toast({
        title: "Succès",
        description: successMessage,
      });
    }

    // Callback de succès
    if (onSuccess) {
      onSuccess();
    }

    return result;
  } catch (error: any) {
    // Log d'erreur détaillé
    if (logError) {
      console.error("❌ Erreur dans safeAction:", {
        message: error?.message || error,
        stack: error?.stack,
        error: error,
      });
    }

    // Toast d'erreur
    if (showErrorToast) {
      toast({
        title: "Erreur",
        description: error?.message || errorMessage,
        variant: "destructive",
      });
    }

    // Callback d'erreur
    if (onError) {
      onError(error);
    }

    return null;
  }
}

/**
 * Version synchrone pour les actions non-asynchrones
 */
export function safeActionSync<T = any>(
  fn: () => T,
  options: SafeActionOptions = {}
): T | null {
  const {
    successMessage,
    errorMessage = "Une erreur est survenue",
    showSuccessToast = true,
    showErrorToast = true,
    logError = true,
    onSuccess,
    onError,
  } = options;

  try {
    const result = fn();


    // Toast de succès
    if (successMessage && showSuccessToast) {
      toast({
        title: "Succès",
        description: successMessage,
      });
    }

    // Callback de succès
    if (onSuccess) {
      onSuccess();
    }

    return result;
  } catch (error: any) {
    // Log d'erreur détaillé
    if (logError) {
      console.error("❌ Erreur dans safeActionSync:", {
        message: error?.message || error,
        stack: error?.stack,
        error: error,
      });
    }

    // Toast d'erreur
    if (showErrorToast) {
      toast({
        title: "Erreur",
        description: error?.message || errorMessage,
        variant: "destructive",
      });
    }

    // Callback d'erreur
    if (onError) {
      onError(error);
    }

    return null;
  }
}

/**
 * Wrapper pour les handlers de boutons avec gestion d'erreur automatique
 */
export function createSafeHandler<T extends (...args: any[]) => any>(
  handler: T,
  options: SafeActionOptions = {}
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    if (handler.constructor.name === "AsyncFunction") {
      safeAction(() => handler(...args), options);
    } else {
      safeActionSync(() => handler(...args), options);
    }
  };
}


