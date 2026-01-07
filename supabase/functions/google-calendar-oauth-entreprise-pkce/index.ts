// ============================================================================
// 🔗 GOOGLE CALENDAR OAUTH - NIVEAU ENTREPRISE (avec PKCE)
// ============================================================================
// Description: Gère l'authentification OAuth 2.0 avec Google Calendar au niveau ENTREPRISE
// Utilise PKCE (Proof Key for Code Exchange) pour une sécurité renforcée
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || "";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
}

// ============================================================================
// UTILITAIRES PKCE
// ============================================================================

/**
 * Génère un code verifier aléatoire
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Génère un code challenge à partir d'un code verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
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

serve(async (req) => {
  // Headers CORS complets
  const origin = req.headers.get("Origin");
  const allowedOrigins = [
    "https://btpsmartpro.com",
    "https://www.btpsmartpro.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin || "") ? origin! : "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur est owner
    const { data: companyUser, error: roleError } = await supabaseClient
      .from("company_users")
      .select("company_id, roles(slug)")
      .eq("user_id", user.id)
      .single();

    if (roleError || !companyUser || companyUser.roles?.slug !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only company owners can manage Google Calendar connection" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = companyUser.company_id;

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ========================================================================
    // ACTION: get_auth_url - Générer l'URL d'authentification Google avec PKCE
    // ========================================================================
    if (action === "get_auth_url") {
      const scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ].join(" ");

      // Générer PKCE
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const state = btoa(JSON.stringify({ 
        user_id: user.id, 
        company_id: companyId,
        code_verifier: codeVerifier // Inclure le verifier dans le state pour le callback
      }));
      
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");

      return new Response(
        JSON.stringify({ 
          auth_url: authUrl.toString(),
          code_verifier: codeVerifier // Retourner aussi pour stockage côté client
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ACTION: exchange_code - Échanger le code d'autorisation contre des tokens (avec PKCE)
    // ========================================================================
    if (action === "exchange_code") {
      const { code, code_verifier, state } = await req.json();

      if (!code || !code_verifier) {
        return new Response(
          JSON.stringify({ error: "code and code_verifier are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Vérifier le state
      let stateData;
      try {
        stateData = JSON.parse(atob(state));
        if (stateData.company_id !== companyId || stateData.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Invalid state" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid state format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Échanger le code contre des tokens avec PKCE
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: GOOGLE_REDIRECT_URI,
          code_verifier: code_verifier, // PKCE
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Google token exchange error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to exchange code for tokens", details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens: GoogleTokenResponse = await tokenResponse.json();

      // Récupérer les informations du compte Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch user info" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userInfo = await userInfoResponse.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Récupérer le nom de l'entreprise
      const { data: company, error: companyError } = await supabaseClient
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      if (companyError || !company) {
        return new Response(
          JSON.stringify({ error: "Company not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Créer un calendrier Google dédié pour l'entreprise
      const calendarName = `Planning – ${company.name}`;
      const calendarResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: calendarName,
          description: `Calendrier de planning pour ${company.name}`,
          timeZone: "Europe/Paris",
        }),
      });

      if (!calendarResponse.ok) {
        const error = await calendarResponse.text();
        console.error("Google Calendar creation error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create Google Calendar", details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const googleCalendar: GoogleCalendar = await calendarResponse.json();

      // Enregistrer ou mettre à jour la connexion
      const { data: existingConnection, error: fetchError } = await supabaseClient
        .from("google_calendar_connections")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      const connectionData = {
        company_id: companyId,
        owner_user_id: user.id,
        google_email: userInfo.email,
        calendar_id: googleCalendar.id,
        calendar_name: calendarName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt.toISOString(),
        sync_direction: "app_to_google",
        sync_planning_enabled: true,
        enabled: true,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existingConnection) {
        // Mettre à jour la connexion existante
        const { data, error } = await supabaseClient
          .from("google_calendar_connections")
          .update(connectionData)
          .eq("id", existingConnection.id)
          .select()
          .single();
        
        result = { data, error };
      } else {
        // Créer une nouvelle connexion
        const { data, error } = await supabaseClient
          .from("google_calendar_connections")
          .insert(connectionData)
          .select()
          .single();
        
        result = { data, error };
      }

      if (result.error) {
        console.error("Database error:", result.error);
        return new Response(
          JSON.stringify({ error: "Failed to save connection", details: result.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mettre à jour companies.google_calendar_id
      await supabaseClient
        .from("companies")
        .update({ google_calendar_id: googleCalendar.id })
        .eq("id", companyId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          connection: {
            id: result.data.id,
            calendar_id: result.data.calendar_id,
            calendar_name: result.data.calendar_name,
            enabled: result.data.enabled,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ACTION: refresh_token - Rafraîchir le token d'accès automatiquement
    // ========================================================================
    if (action === "refresh_token") {
      const { connection_id } = await req.json();

      if (!connection_id) {
        return new Response(
          JSON.stringify({ error: "connection_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Récupérer la connexion
      const { data: connection, error: connError } = await supabaseClient
        .from("google_calendar_connections")
        .select("*")
        .eq("id", connection_id)
        .eq("company_id", companyId)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "Connection not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Vérifier si le token est expiré ou va expirer dans les 5 prochaines minutes
      const expiresAt = new Date(connection.expires_at);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (expiresAt > fiveMinutesFromNow && connection.access_token) {
        // Token encore valide
        return new Response(
          JSON.stringify({ 
            success: true, 
            access_token: connection.access_token,
            expires_at: connection.expires_at,
            refreshed: false,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({ error: "No refresh token available" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rafraîchir le token
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: connection.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        const error = await refreshResponse.text();
        console.error("Google token refresh error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to refresh token", details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newTokens: GoogleTokenResponse = await refreshResponse.json();
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      // Mettre à jour la connexion
      const { data: updatedConnection, error: updateError } = await supabaseClient
        .from("google_calendar_connections")
        .update({
          access_token: newTokens.access_token,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection_id)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update connection", details: updateError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          access_token: updatedConnection.access_token,
          expires_at: updatedConnection.expires_at,
          refreshed: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ACTION: disconnect - Déconnecter Google Calendar
    // ========================================================================
    if (action === "disconnect") {
      const { connection_id } = await req.json();

      if (!connection_id) {
        return new Response(
          JSON.stringify({ error: "connection_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Récupérer la connexion
      const { data: connection, error: connError } = await supabaseClient
        .from("google_calendar_connections")
        .select("*")
        .eq("id", connection_id)
        .eq("company_id", companyId)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "Connection not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Supprimer le calendrier Google (optionnel)
      try {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${connection.calendar_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
          },
        });
      } catch (error) {
        console.error("Error deleting Google Calendar:", error);
        // Continue même si la suppression échoue
      }

      // Supprimer la connexion
      const { error: deleteError } = await supabaseClient
        .from("google_calendar_connections")
        .delete()
        .eq("id", connection_id)
        .eq("company_id", companyId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Failed to disconnect", details: deleteError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Nettoyer companies.google_calendar_id
      await supabaseClient
        .from("companies")
        .update({ google_calendar_id: null })
        .eq("id", companyId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


