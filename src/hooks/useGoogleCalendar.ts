// ============================================================================
// 🔗 HOOKS GOOGLE CALENDAR
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  storeCodeVerifier,
  clearCodeVerifier 
} from "@/utils/pkce";
import { safeSessionStorage } from "@/utils/isBrowser";

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleCalendarConnection {
  id: string;
  company_id: string;
  owner_user_id: string;
  google_email: string;
  calendar_id: string;
  calendar_name: string;
  calendar_type: "planning" | "agenda" | "events";
  sync_direction: "app_to_google" | "bidirectional" | "google_to_app";
  sync_planning_enabled: boolean;
  enabled: boolean;
  expires_at: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Récupère la connexion Google Calendar active de l'entreprise (legacy - planning uniquement)
 * @deprecated Utilisez useGoogleCalendarConnections pour gérer les 3 calendriers
 */
export const useGoogleCalendarConnection = () => {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["google_calendar_connection", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) {
        return null;
      }

      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("company_id", currentCompanyId)
        .eq("calendar_type", "planning") // Legacy: retourne uniquement le calendrier Planning
        // Ne pas filtrer par enabled=true pour voir toutes les connexions
        // Le composant affichera le statut même si enabled=false
        .maybeSingle();

      if (error) {
        console.error("❌ [useGoogleCalendarConnection] Erreur:", error);
        throw error;
      }

      return data as GoogleCalendarConnection | null;
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Récupère TOUTES les connexions Google Calendar de l'entreprise (Planning, Agenda, Événements)
 */
export const useGoogleCalendarConnections = () => {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["google_calendar_connections_all", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) {
        return [];
      }

      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("calendar_type");

      if (error) {
        console.error("❌ [useGoogleCalendarConnections] Erreur:", error);
        throw error;
      }

      return (data || []) as GoogleCalendarConnection[];
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Récupère une connexion Google Calendar par type
 */
export const useGoogleCalendarConnectionByType = (calendarType: "planning" | "agenda" | "events") => {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["google_calendar_connection", currentCompanyId, calendarType],
    queryFn: async () => {
      if (!currentCompanyId) {
        return null;
      }

      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("company_id", currentCompanyId)
        .eq("calendar_type", calendarType)
        .maybeSingle();

      if (error) {
        console.error(`❌ [useGoogleCalendarConnectionByType(${calendarType})] Erreur:`, error);
        throw error;
      }

      return data as GoogleCalendarConnection | null;
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Obtient l'URL d'authentification Google avec PKCE
 * Génère code_verifier et code_challenge côté frontend (RFC 7636)
 * Stocke code_verifier dans sessionStorage pour l'échange
 */
export const useGetGoogleAuthUrl = (calendarType: "planning" | "agenda" | "events" = "planning") => {
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentCompanyId) {
        throw new Error("Company ID manquant");
      }

      // 1. Générer PKCE côté frontend (RFC 7636)
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // 2. Stocker code_verifier dans sessionStorage pour l'échange (avec le type de calendrier)
      storeCodeVerifier(codeVerifier, calendarType);

      if (process.env.NODE_ENV === 'development') {
        console.log("🔐 [useGetGoogleAuthUrl] PKCE généré:");
        console.log("  - calendar_type:", calendarType);
        console.log("  - code_verifier:", codeVerifier.substring(0, 20) + "...");
        console.log("  - code_challenge:", codeChallenge.substring(0, 20) + "...");
      }

      // 3. Appeler l'Edge Function avec code_challenge et calendar_type
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise-pkce", {
        body: {
          action: "get_auth_url",
          code_challenge: codeChallenge,
          company_id: currentCompanyId,
          calendar_type: calendarType,
        },
      });

      if (error) {
        // Nettoyer le code_verifier en cas d'erreur
        clearCodeVerifier();
        console.error("❌ [useGetGoogleAuthUrl] Erreur:", error);
        throw error;
      }

      if (!data?.url) {
        clearCodeVerifier();
        throw new Error("URL d'authentification non reçue");
      }

      return data.url as string;
    },
  });
};

/**
 * Échange le code d'autorisation contre des tokens
 * Utilise google-calendar-oauth-entreprise-pkce pour l'échange
 */
export const useExchangeGoogleCode = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ code, state, companyId }: { code: string; state: string; companyId?: string }) => {
      // Utiliser companyId fourni, ou currentCompanyId, ou essayer de décoder depuis state
      let effectiveCompanyId = companyId || currentCompanyId;
      
      // Si toujours pas de company_id, essayer de le décoder depuis le state
      if (!effectiveCompanyId && state) {
        try {
          const decodedState = JSON.parse(atob(state));
          effectiveCompanyId = decodedState.company_id || null;
        } catch (e) {
          console.warn("⚠️ Could not decode state for company_id:", e);
        }
      }
      
      if (!effectiveCompanyId) {
        throw new Error("Company ID manquant");
      }

      // Récupérer le code_verifier depuis sessionStorage (PKCE RFC 7636)
      // Utiliser safeSessionStorage pour éviter les erreurs SSR
      const codeVerifier = safeSessionStorage.getItem("google_oauth_code_verifier");

      if (!codeVerifier) {
        throw new Error("code_verifier manquant. Le flow PKCE nécessite un code_verifier stocké dans sessionStorage.");
      }

      // Logs de debugging (une seule fois)
      if (process.env.NODE_ENV === 'development') {
        console.log("🔍 [useExchangeGoogleCode] Paramètres d'échange PKCE:");
        console.log("  - code:", code ? "present" : "missing");
        console.log("  - code_verifier:", codeVerifier ? `present (${codeVerifier.length} chars)` : "missing");
        console.log("  - state:", state ? "present" : "missing");
        console.log("  - company_id:", effectiveCompanyId || "missing");
      }

      // Utiliser la version PKCE de l'Edge Function pour l'échange
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise-pkce", {
        body: { 
          action: "exchange_code", 
          code,
          code_verifier: codeVerifier, // Requis pour PKCE
          state,
          company_id: effectiveCompanyId, // Passer explicitement le company_id
        },
      });

      if (error) {
        console.error("❌ [useExchangeGoogleCode] Erreur:", error);
        console.error("❌ [useExchangeGoogleCode] Error details:", {
          message: error.message,
          context: error.context,
          status: error.status,
          data: error.data
        });
        
        // Si l'erreur contient des détails, les afficher
        if (error.data) {
          console.error("❌ [useExchangeGoogleCode] Error data:", JSON.stringify(error.data, null, 2));
          
          // Si c'est une erreur structurée de l'Edge Function, la propager
          if (error.data.error || error.data.message) {
            const enhancedError = new Error(error.data.message || error.data.error || error.message);
            (enhancedError as any).data = error.data;
            (enhancedError as any).status = error.status || error.data.status;
            throw enhancedError;
          }
        }
        
        throw error;
      }

      // Nettoyer le code_verifier après utilisation réussie
      clearCodeVerifier();

      // Invalider le cache de la connexion
      queryClient.invalidateQueries({ queryKey: ["google_calendar_connection"] });

      // ⚠️ IMPORTANT: Initialiser le webhook Google Calendar après connexion réussie
      // Cela active les notifications push pour la synchronisation Google → App
      if (data && effectiveCompanyId) {
        try {
          console.log("🔄 [useExchangeGoogleCode] Initialisation du webhook Google Calendar...");
          const { data: watchData, error: watchError } = await supabase.functions.invoke(
            "google-calendar-watch",
            {
              body: { company_id: effectiveCompanyId },
            }
          );

          if (watchError) {
            console.warn("⚠️ [useExchangeGoogleCode] Erreur initialisation webhook:", watchError);
            // Ne pas bloquer le flow si le webhook échoue (peut être configuré plus tard)
          } else {
            console.log("✅ [useExchangeGoogleCode] Webhook Google Calendar initialisé:", watchData);
          }
        } catch (watchErr) {
          console.warn("⚠️ [useExchangeGoogleCode] Erreur lors de l'initialisation du webhook:", watchErr);
          // Ne pas bloquer le flow si le webhook échoue
        }
      }

      return data;
    },
  });
};

/**
 * Déconnecte Google Calendar
 */
export const useDisconnectGoogleCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise-pkce", {
        body: { action: "disconnect", connection_id: connectionId },
      });

      if (error) {
        console.error("❌ [useDisconnectGoogleCalendar] Erreur:", error);
        throw error;
      }

      // Invalider le cache
      queryClient.invalidateQueries({ queryKey: ["google_calendar_connection"] });

      return data;
    },
  });
};

/**
 * Synchronise un événement avec Google Calendar
 */
export const useSyncEventWithGoogle = () => {
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      action, 
      eventId 
    }: { 
      action: "create" | "update" | "delete";
      eventId: string;
    }) => {
      if (!currentCompanyId) {
        throw new Error("Company ID manquant");
      }

      const { data, error } = await supabase.functions.invoke("google-calendar-sync-entreprise", {
        body: {
          action,
          event_id: eventId,
          company_id: currentCompanyId,
          event_type: "event",
        },
      });

      if (error) {
        console.error(`❌ [useSyncEventWithGoogle] Erreur ${action}:`, error);
        throw error;
      }

      return data;
    },
  });
};
