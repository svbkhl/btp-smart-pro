// ============================================================================
// 🔧 GOOGLE CALENDAR HELPERS - Fonctions réutilisables
// ============================================================================
// Description: Helpers pour conversion dates, formatage événements Google
// ============================================================================

export interface GoogleEventDate {
  date?: string; // Format: YYYY-MM-DD (pour all_day)
  dateTime?: string; // Format: ISO 8601 (pour événements avec heure)
  timeZone?: string; // Ex: "Europe/Paris"
}

/**
 * Convertit une date Supabase en format Google Calendar
 * @param dateString Date ISO string depuis Supabase
 * @param allDay Si true, retourne { date }, sinon { dateTime, timeZone }
 * @param timeZone Timezone (défaut: "Europe/Paris")
 */
export function formatGoogleCalendarDate(
  dateString: string,
  allDay: boolean,
  timeZone: string = "Europe/Paris"
): GoogleEventDate {
  if (allDay) {
    // Pour all_day, utiliser seulement la date (sans heure)
    const dateOnly = dateString.split("T")[0]; // YYYY-MM-DD
    return { date: dateOnly };
  } else {
    // Pour événement avec heure, utiliser dateTime + timeZone
    return {
      dateTime: dateString, // Déjà en ISO 8601
      timeZone: timeZone,
    };
  }
}

/**
 * Convertit une date Google Calendar en format Supabase
 * @param googleDate Objet { date } ou { dateTime, timeZone } depuis Google
 * @returns Date ISO string pour Supabase
 */
export function parseGoogleCalendarDate(googleDate: GoogleEventDate | undefined): string | null {
  if (!googleDate) return null;
  
  if (googleDate.date) {
    // all_day: date est au format YYYY-MM-DD
    // Convertir en timestamptz (début de journée UTC)
    return `${googleDate.date}T00:00:00.000Z`;
  } else if (googleDate.dateTime) {
    // Événement avec heure: dateTime est déjà en ISO 8601
    return googleDate.dateTime;
  }
  
  return null;
}

/**
 * Détermine si un événement Google est all_day
 * @param googleDate Objet { date } ou { dateTime } depuis Google
 */
export function isGoogleEventAllDay(googleDate: GoogleEventDate | undefined): boolean {
  if (!googleDate) return false;
  return !!googleDate.date && !googleDate.dateTime;
}

/**
 * Crée un objet GoogleEvent pour l'API Google Calendar
 */
export interface GoogleEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: GoogleEventDate;
  end: GoogleEventDate;
  colorId?: string;
}

export function createGoogleEventPayload(
  title: string,
  description: string | null | undefined,
  location: string | null | undefined,
  startDate: string,
  endDate: string | null | undefined,
  allDay: boolean,
  timeZone: string = "Europe/Paris"
): GoogleEventPayload {
  const start = formatGoogleCalendarDate(startDate, allDay, timeZone);
  
  // Pour end, utiliser endDate si fourni, sinon startDate + 1 jour (pour all_day) ou même heure
  let end: GoogleEventDate;
  if (endDate) {
    end = formatGoogleCalendarDate(endDate, allDay, timeZone);
  } else if (allDay) {
    // Si all_day sans endDate, utiliser startDate + 1 jour
    const startDateOnly = startDate.split("T")[0];
    const nextDay = new Date(startDateOnly);
    nextDay.setDate(nextDay.getDate() + 1);
    end = { date: nextDay.toISOString().split("T")[0] };
  } else {
    // Si non all_day sans endDate, utiliser startDate (événement instantané)
    end = formatGoogleCalendarDate(startDate, allDay, timeZone);
  }

  return {
    summary: title,
    description: description || undefined,
    location: location || undefined,
    start,
    end,
  };
}
