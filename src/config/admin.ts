/**
 * Configuration admin système.
 * Utilisé pour : onglets admin Paramètres, skip onboarding guide, etc.
 */

const ENV = import.meta.env;

/** Emails admin par défaut (toujours admin, jamais retiré) */
const DEFAULT_ADMIN_EMAILS = ["sabri.khalfallah6@gmail.com"];

/** Emails admin depuis la variable d'environnement (séparés par virgule) */
const ENV_EMAILS = (ENV.VITE_ADMIN_EMAILS || ENV.VITE_ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Liste finale des emails admin */
export const ADMIN_EMAILS = ENV_EMAILS.length > 0 ? ENV_EMAILS : DEFAULT_ADMIN_EMAILS;

/** Emails des closers (accès création entreprise + invitation dirigeant, sans suppression) */
const DEFAULT_CLOSER_EMAILS: string[] = ["sabbg.du73100@gmail.com"];
const CLOSER_ENV = (ENV.VITE_CLOSER_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
export const CLOSER_EMAILS = CLOSER_ENV.length > 0 ? CLOSER_ENV : DEFAULT_CLOSER_EMAILS;

/**
 * Vérifie si l'email est un compte closer (commercial).
 */
export function isCloserEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== "string") return false;
  return CLOSER_EMAILS.includes(email.toLowerCase().trim());
}

/** Emails qui forcent la vue employé (sidebar, dashboard) même sans company */
const EMPLOYEE_VIEW_EMAILS: string[] = [];

/**
 * Vérifie si l'utilisateur doit voir l'interface employé (bypass rôle).
 */
export function isEmployeeViewEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== "string") return false;
  return EMPLOYEE_VIEW_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Vérifie si l'email est un compte admin système.
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== "string") return false;
  const lower = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(lower);
}

/**
 * Vérifie si l'utilisateur est admin système (email uniquement).
 */
export function isSystemAdmin(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  raw_user_meta_data?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
} | null): boolean {
  if (!user) return false;
  return isAdminEmail(user.email);
}
