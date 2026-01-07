/**
 * Validation des variables d'environnement au démarrage
 * Assure que toutes les variables requises sont présentes
 */

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  errors: string[];
}

/**
 * Valide les variables d'environnement requises
 */
export function validateEnv(): EnvValidationResult {
  const required: (keyof EnvConfig)[] = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ];

  const missing: string[] = [];
  const errors: string[] = [];

  for (const key of required) {
    const value = import.meta.env[key];
    
    if (!value || value.trim() === "") {
      missing.push(key);
    } else {
      // Validations spécifiques
      if (key === "VITE_SUPABASE_URL") {
        try {
          new URL(value);
        } catch {
          errors.push(`${key} doit être une URL valide`);
        }
      }
      
      if (key === "VITE_SUPABASE_PUBLISHABLE_KEY") {
        if (value.length < 20) {
          errors.push(`${key} semble invalide (trop court)`);
        }
      }
    }
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

/**
 * Initialise et valide l'environnement
 * Doit être appelé au démarrage de l'application
 */
export function initEnv(): void {
  const validation = validateEnv();

  if (!validation.valid) {
    const errorMessages = [
      "❌ Variables d'environnement manquantes ou invalides:",
      ...validation.missing.map((key) => `  - ${key} est manquant`),
      ...validation.errors,
      "",
      "Veuillez vérifier votre fichier .env",
    ];

    console.error(errorMessages.join("\n"));

    // En production, on log l'erreur mais on ne bloque pas le build
    // Les variables d'environnement doivent être configurées dans Vercel
    if (import.meta.env.PROD) {
      console.error("⚠️ Variables d'environnement manquantes en production");
      // Ne pas throw pour éviter de bloquer le build Vercel
      // L'application affichera des erreurs à l'utilisation si les variables sont vraiment manquantes
    }
  } else {
    console.log("✅ Variables d'environnement validées");
  }
}

/**
 * Récupère une variable d'environnement avec une valeur par défaut
 */
export function getEnv(key: keyof EnvConfig, defaultValue?: string): string {
  const value = import.meta.env[key];
  
  if (!value && defaultValue) {
    return defaultValue;
  }
  
  if (!value) {
    throw new Error(`Variable d'environnement ${key} manquante`);
  }
  
  return value;
}



