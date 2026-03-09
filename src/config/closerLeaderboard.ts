/**
 * Comptes test à ne pas afficher sur le podium / classement closers.
 */

export const HIDDEN_CLOSER_PATTERNS = ["momo"];

export function isHiddenCloser(entry: {
  closer_email?: string | null;
  closer_name?: string | null;
}): boolean {
  const email = (entry.closer_email ?? "").toLowerCase();
  const name = (entry.closer_name ?? "").toLowerCase();
  return HIDDEN_CLOSER_PATTERNS.some(
    (pattern) => email.includes(pattern.toLowerCase()) || name.includes(pattern.toLowerCase())
  );
}
