/**
 * Configuration admin système.
 * Utilisé pour : onglets admin Paramètres, skip onboarding guide, etc.
 */

const ENV = import.meta.env;

/** Emails admin par défaut (toujours admin, jamais retiré) */
const DEFAULT_ADMIN_EMAILS = ["sabri.khalfallah6@gmail.com", "sabri.khalallah6@gmail.com", "khalfallahs.ndrc@gmail.com"];

/** Emails admin depuis la variable d'environnement (séparés par virgule) */
const ENV_EMAILS = (ENV.VITE_ADMIN_EMAILS || ENV.VITE_ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Liste finale des emails admin */
export const ADMIN_EMAILS = ENV_EMAILS.length > 0 ? ENV_EMAILS : DEFAULT_ADMIN_EMAILS;

/** Emails qui forcent la vue employé (sidebar, dashboard) même sans company */
const EMPLOYEE_VIEW_EMAILS = ["khalfallahs.ndrc@gmail.com", "khalfallah.sndrc@gmail.com"];

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
 * Vérifie si l'utilisateur est admin système (metadata ou email).
 */
export function isSystemAdmin(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  raw_user_meta_data?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
} | null): boolean {
  if (!user) return false;

  // 1. Email dans la liste admin
  if (isAdminEmail(user.email)) return true;

  // 2. Metadata JWT (raw_user_meta_data prioritaire, puis user_metadata, app_metadata)
  const raw = user.raw_user_meta_data as Record<string, unknown> | undefined;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const app = user.app_metadata as Record<string, unknown> | undefined;

  const check = (obj: Record<string, unknown> | undefined, key: string) =>
    obj?.[key] === true || obj?.[key] === "true";

  return (
    check(raw, "is_system_admin") ||
    check(meta, "is_system_admin") ||
    check(app, "is_system_admin")
  );
}
