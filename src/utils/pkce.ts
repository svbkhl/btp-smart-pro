// ============================================================================
// 🔐 PKCE (Proof Key for Code Exchange) - OAuth 2.0 Security
// ============================================================================
// Implémentation PKCE pour sécuriser le flux OAuth Google Calendar
// ============================================================================

import { safeSessionStorage } from "./isBrowser";

/**
 * Génère un code verifier aléatoire (43-128 caractères)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Génère un code challenge à partir d'un code verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(digest));
}

/**
 * Encode un array d'octets en base64 URL-safe
 */
function base64URLEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Stocke le code verifier dans sessionStorage (avec calendar_type optionnel)
 */
export function storeCodeVerifier(verifier: string, calendarType?: string): void {
  safeSessionStorage.setItem("google_oauth_code_verifier", verifier);
  if (calendarType) {
    safeSessionStorage.setItem("google_oauth_calendar_type", calendarType);
  }
}

/**
 * Récupère le code verifier depuis sessionStorage
 */
export function getCodeVerifier(): string | null {
  return safeSessionStorage.getItem("google_oauth_code_verifier");
}

/**
 * Récupère le calendar_type depuis sessionStorage
 */
export function getCalendarType(): string | null {
  return safeSessionStorage.getItem("google_oauth_calendar_type");
}

/**
 * Supprime le code verifier et calendar_type de sessionStorage
 */
export function clearCodeVerifier(): void {
  safeSessionStorage.removeItem("google_oauth_code_verifier");
  safeSessionStorage.removeItem("google_oauth_calendar_type");
}


