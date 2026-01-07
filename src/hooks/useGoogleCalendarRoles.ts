// ============================================================================
// 🔐 HOOKS DE GESTION DES RÔLES GOOGLE CALENDAR
// ============================================================================
// Description: Gère les permissions et rôles pour Google Calendar
// ============================================================================

import { usePermissions } from "@/hooks/usePermissions";

/**
 * Vérifie si l'utilisateur peut connecter Google Calendar
 * Seul le propriétaire (owner) peut connecter
 */
export function useCanConnectGoogleCalendar() {
  const { isOwner } = usePermissions();
  return isOwner;
}

/**
 * Vérifie si l'utilisateur peut gérer les paramètres Google Calendar
 * Seul le propriétaire (owner) peut gérer
 */
export function useCanManageGoogleCalendarSettings() {
  const { isOwner } = usePermissions();
  return isOwner;
}

/**
 * Vérifie si l'utilisateur peut créer/modifier/supprimer des événements
 * - Owner : Oui
 * - RH : Oui (gestion des plannings)
 * - Employee : Non (lecture seule)
 */
export function useCanManageEvents() {
  const { isOwner, isRH, can } = usePermissions();
  return isOwner || isRH || can("events.manage") || can("planning.manage");
}

/**
 * Vérifie si l'utilisateur peut synchroniser avec Google Calendar
 * - Owner : Oui
 * - RH : Oui
 * - Employee : Non
 */
export function useCanSyncWithGoogleCalendar() {
  const { isOwner, isRH } = usePermissions();
  return isOwner || isRH;
}

/**
 * Vérifie si l'utilisateur peut voir les événements Google Calendar
 * Tous les utilisateurs peuvent voir (lecture seule)
 */
export function useCanViewGoogleCalendar() {
  return true; // Tous les utilisateurs peuvent voir
}


