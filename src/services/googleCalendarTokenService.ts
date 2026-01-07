// ============================================================================
// 🔄 SERVICE DE RAFRAÎCHISSEMENT AUTOMATIQUE DES TOKENS GOOGLE CALENDAR
// ============================================================================
// Description: Gère le rafraîchissement automatique des tokens Google Calendar
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

interface TokenRefreshResult {
  access_token: string;
  expires_at: string;
  refreshed: boolean;
}

/**
 * Rafraîchit automatiquement le token d'accès Google Calendar si nécessaire
 * Vérifie l'expiration et rafraîchit si le token expire dans les 5 prochaines minutes
 */
export async function refreshGoogleCalendarTokenIfNeeded(
  connectionId: string,
  companyId: string
): Promise<TokenRefreshResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise-pkce", {
      body: {
        action: "refresh_token",
        connection_id: connectionId,
      },
    });

    if (error) {
      console.error("❌ [refreshGoogleCalendarTokenIfNeeded] Erreur:", error);
      return null;
    }

    return data as TokenRefreshResult;
  } catch (error) {
    console.error("❌ [refreshGoogleCalendarTokenIfNeeded] Exception:", error);
    return null;
  }
}

/**
 * Récupère un token valide pour une connexion Google Calendar
 * Rafraîchit automatiquement si nécessaire
 */
export async function getValidGoogleCalendarToken(
  connectionId: string,
  companyId: string
): Promise<string | null> {
  try {
    // Récupérer la connexion
    const { data: connection, error } = await supabase
      .from("google_calendar_connections")
      .select("access_token, expires_at, refresh_token")
      .eq("id", connectionId)
      .eq("company_id", companyId)
      .single();

    if (error || !connection) {
      console.error("❌ [getValidGoogleCalendarToken] Connexion non trouvée:", error);
      return null;
    }

    // Vérifier si le token est expiré ou va expirer dans les 5 prochaines minutes
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow && connection.access_token) {
      // Token encore valide
      return connection.access_token;
    }

    // Token expiré ou va expirer, rafraîchir
    if (!connection.refresh_token) {
      console.error("❌ [getValidGoogleCalendarToken] Pas de refresh_token disponible");
      return null;
    }

    const refreshResult = await refreshGoogleCalendarTokenIfNeeded(connectionId, companyId);
    return refreshResult?.access_token || null;
  } catch (error) {
    console.error("❌ [getValidGoogleCalendarToken] Exception:", error);
    return null;
  }
}


