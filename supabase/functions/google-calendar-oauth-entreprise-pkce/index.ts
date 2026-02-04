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
    "http://localhost:4000",
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

    // Lire le body une fois pour récupérer action et company_id (évite .single() qui échoue si plusieurs entreprises)
    let bodyParsed: Record<string, unknown> = {};
    if (req.method === "POST") {
      try {
        const bodyText = await req.text();
        if (bodyText) bodyParsed = JSON.parse(bodyText) as Record<string, unknown>;
      } catch (_e) {
        // ignorer
      }
    }
    const companyIdFromBody = bodyParsed?.company_id as string | undefined;
    const actionFromBody = bodyParsed?.action as string | undefined;

    // Vérifier que l'utilisateur est owner ou admin pour la société ciblée (company_id du body)
    // Si pas de company_id en body, on vérifie sur une seule société (premier résultat)
    const { data: companyUserRows, error: roleError } = await supabaseClient
      .from("company_users")
      .select("company_id, roles(slug)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(10);

    if (roleError) {
      console.error("❌ [Role check] Error:", roleError);
      return new Response(
        JSON.stringify({ error: "User not associated with a company or insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyUser = companyIdFromBody
      ? (companyUserRows ?? []).find((r: { company_id: string }) => r.company_id === companyIdFromBody)
      : (companyUserRows ?? [])[0];

    if (!companyUser) {
      console.error("❌ [Role check] No company user for company:", companyIdFromBody || "any");
      return new Response(
        JSON.stringify({ error: "User not associated with this company or insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userRoleSlug = (companyUser as { roles?: { slug?: string } }).roles?.slug;
    const allowedSlugs = ["owner", "admin"];
    if (!userRoleSlug || !allowedSlugs.includes(userRoleSlug)) {
      console.error("❌ [Role check] User role is not owner or admin:", userRoleSlug);
      return new Response(
        JSON.stringify({ error: "Only company owners or administrators can manage Google Calendar connection" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [Role check] User has permission:", userRoleSlug);

    const companyId = (companyUser as { company_id: string }).company_id;

    const url = new URL(req.url);
    let action = url.searchParams.get("action") || actionFromBody;
    
    console.log("🔍 [Request] Action:", action || "not provided");
    console.log("🔍 [Request] Method:", req.method);
    console.log("🔍 [Request] URL:", req.url);
    
    // Si toujours pas d'action, retourner une erreur
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter. Provide ?action=exchange_code in URL or in body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ACTION: get_auth_url - Générer l'URL d'authentification Google avec PKCE
    // ========================================================================
    if (action === "get_auth_url") {
      const codeChallenge = bodyParsed?.code_challenge as string | undefined;
      const calendarType = (bodyParsed?.calendar_type as string) || "planning";
      
      if (!codeChallenge) {
        return new Response(
          JSON.stringify({ 
            error: "code_challenge is required. Generate it client-side using PKCE (RFC 7636)." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("🔐 [get_auth_url] PKCE code_challenge reçu depuis le frontend");
      console.log("📅 [get_auth_url] Calendar type:", calendarType);

      const scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ].join(" ");

      // Créer le state avec user_id, company_id et calendar_type
      const state = btoa(JSON.stringify({ 
        user_id: user.id, 
        company_id: companyId,
        calendar_type: calendarType,
        // Ne PAS inclure code_verifier dans le state - il doit rester côté client
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

      console.log("✅ [get_auth_url] URL OAuth générée avec PKCE");
      console.log("🔗 [get_auth_url] Redirect URI:", GOOGLE_REDIRECT_URI);
      console.log("📅 [get_auth_url] Calendar type:", calendarType);

      return new Response(
        JSON.stringify({ 
          url: authUrl.toString()
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ACTION: exchange_code - Échanger le code d'autorisation contre des tokens (avec PKCE)
    // ========================================================================
    if (action === "exchange_code") {
      const body = bodyParsed as Record<string, unknown>;
      const { code, code_verifier, state, company_id: companyIdFromBody } = body;
      
      console.log("🔍 [exchange_code] Body parsé:", {
        hasCode: !!code,
        hasCodeVerifier: !!code_verifier,
        hasState: !!state,
        hasCompanyId: !!companyIdFromBody,
        companyId: companyIdFromBody
      });
      
      console.log("🔍 [exchange_code] Paramètres reçus:");
      console.log("  - code:", code ? "present" : "missing");
      console.log("  - code_verifier:", code_verifier ? "present" : "missing");
      console.log("  - state:", state ? "present" : "missing");
      console.log("  - company_id (body):", companyIdFromBody || "not provided");
      console.log("  - company_id (session):", companyId || "not available");

      if (!code) {
        console.error("❌ [exchange_code] Code manquant");
        return new Response(
          JSON.stringify({ error: "code is required", received: { code: !!code, code_verifier: !!code_verifier, state: !!state, company_id: !!companyIdFromBody } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Vérifier le state et récupérer company_id depuis le state ou le body
      let stateData: any = null;
      let effectiveCompanyId = companyId; // Utiliser celui de la session par défaut
      
      try {
        if (state) {
          stateData = JSON.parse(atob(state));
          
          // Utiliser company_id du body si fourni, sinon celui du state, sinon celui de la session
          if (companyIdFromBody) {
            effectiveCompanyId = companyIdFromBody;
          } else if (stateData.company_id) {
            effectiveCompanyId = stateData.company_id;
          }
          
          // Vérifier que le user_id correspond
          if (stateData.user_id && stateData.user_id !== user.id) {
            return new Response(
              JSON.stringify({ error: "Invalid state: user_id mismatch" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        // Vérifier que company_id est présent
        if (!effectiveCompanyId) {
          return new Response(
            JSON.stringify({ error: "Company ID manquant" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.warn("⚠️ [exchange_code] Erreur lors du décodage du state:", e);
        // Si le state ne peut pas être décodé, utiliser company_id du body si fourni
        if (companyIdFromBody) {
          effectiveCompanyId = companyIdFromBody;
        } else if (!effectiveCompanyId) {
          return new Response(
            JSON.stringify({ error: "Invalid state format and no company_id provided" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // Utiliser effectiveCompanyId au lieu de companyId pour le reste de la fonction
      const finalCompanyId = effectiveCompanyId;
      
      // code_verifier est optionnel si PKCE n'a pas été utilisé initialement
      // Si absent, on essaie de le récupérer depuis le state
      let finalCodeVerifier = code_verifier;
      if (!finalCodeVerifier && stateData?.code_verifier) {
        finalCodeVerifier = stateData.code_verifier;
        console.log("✅ [exchange_code] code_verifier récupéré depuis le state");
      }
      
      if (!finalCodeVerifier) {
        console.warn("⚠️ [exchange_code] code_verifier manquant - tentative sans PKCE");
        // Continuer sans PKCE si le code_verifier n'est pas disponible
        // Google acceptera l'échange sans PKCE si le flow initial n'utilisait pas PKCE
      }

      // Échanger le code contre des tokens (avec ou sans PKCE selon disponibilité)
      const tokenParams: Record<string, string> = {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: GOOGLE_REDIRECT_URI,
      };
      
      // Ajouter code_verifier seulement s'il est disponible (PKCE)
      if (finalCodeVerifier) {
        tokenParams.code_verifier = finalCodeVerifier;
        console.log("✅ [exchange_code] Utilisation de PKCE");
      } else {
        console.log("⚠️ [exchange_code] Échange sans PKCE");
      }
      
      console.log("🔄 [exchange_code] Appel à Google token endpoint...");
      console.log("🔄 [exchange_code] Token params:", {
        hasClientId: !!tokenParams.client_id,
        clientIdLength: tokenParams.client_id?.length || 0,
        hasClientSecret: !!tokenParams.client_secret,
        clientSecretLength: tokenParams.client_secret?.length || 0,
        hasCode: !!tokenParams.code,
        codeLength: tokenParams.code?.length || 0,
        codePreview: tokenParams.code ? tokenParams.code.substring(0, 20) + "..." : "missing",
        redirectUri: tokenParams.redirect_uri,
        hasCodeVerifier: !!tokenParams.code_verifier,
        grantType: tokenParams.grant_type
      });

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(tokenParams),
      });

      console.log("📥 [exchange_code] Réponse Google reçue:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        ok: tokenResponse.ok
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorDetails: any;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }
        console.error("❌ [exchange_code] ========================================");
        console.error("❌ [exchange_code] ERREUR GOOGLE TOKEN EXCHANGE");
        console.error("❌ [exchange_code] ========================================");
        console.error("❌ [exchange_code] Status:", tokenResponse.status);
        console.error("❌ [exchange_code] Status Text:", tokenResponse.statusText);
        console.error("❌ [exchange_code] Error Details:", JSON.stringify(errorDetails, null, 2));
        console.error("❌ [exchange_code] Error Text:", errorText);
        console.error("❌ [exchange_code] Request Params:", {
          client_id: tokenParams.client_id ? "present" : "missing",
          client_secret: tokenParams.client_secret ? "present" : "missing",
          code: tokenParams.code ? "present" : "missing",
          redirect_uri: tokenParams.redirect_uri,
          grant_type: tokenParams.grant_type,
          code_verifier: tokenParams.code_verifier ? "present" : "missing"
        });
        console.error("❌ [exchange_code] ========================================");
        
        // Extraire le message d'erreur de Google
        const googleError = errorDetails?.error || "unknown_error";
        const googleErrorDescription = errorDetails?.error_description || errorText || "No description";
        
        // Message d'erreur plus explicite
        let userMessage = "Impossible d'échanger le code d'autorisation";
        if (googleError === "invalid_grant") {
          userMessage = "Le code d'autorisation a expiré ou a déjà été utilisé. Veuillez relancer la connexion.";
        } else if (googleError === "invalid_client") {
          userMessage = "Erreur de configuration Google OAuth. Vérifiez les identifiants dans Supabase Secrets.";
        } else if (googleError === "redirect_uri_mismatch") {
          userMessage = "L'URI de redirection ne correspond pas. Vérifiez GOOGLE_REDIRECT_URI dans Supabase Secrets.";
        }
        
        return new Response(
          JSON.stringify({ 
            error: "Failed to exchange code for tokens",
            google_error: googleError,
            google_error_description: googleErrorDescription,
            details: errorDetails,
            status: tokenResponse.status,
            message: userMessage,
            technical_details: process.env.NODE_ENV === "development" ? {
              error_text: errorText,
              request_params: {
                has_client_id: !!tokenParams.client_id,
                has_client_secret: !!tokenParams.client_secret,
                has_code: !!tokenParams.code,
                redirect_uri: tokenParams.redirect_uri,
                grant_type: tokenParams.grant_type,
                has_code_verifier: !!tokenParams.code_verifier
              }
            } : undefined
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [exchange_code] Token exchange réussi !");

      let tokens: GoogleTokenResponse;
      try {
        // Utiliser .json() directement au lieu de .text() puis JSON.parse()
        tokens = await tokenResponse.json();
        
        console.log("✅ [exchange_code] Tokens reçus de Google:", {
          hasAccessToken: !!tokens.access_token,
          accessTokenLength: tokens.access_token?.length || 0,
          accessTokenPreview: tokens.access_token ? tokens.access_token.substring(0, 30) + "..." : "MISSING",
          hasRefreshToken: !!tokens.refresh_token,
          refreshTokenLength: tokens.refresh_token?.length || 0,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type || "Bearer",
          scope: tokens.scope,
          allKeys: Object.keys(tokens)
        });
        
        // Vérifier que les scopes incluent userinfo
        if (tokens.scope && !tokens.scope.includes("userinfo")) {
          console.warn("⚠️ [exchange_code] Les scopes ne semblent pas inclure userinfo:", tokens.scope);
        }
        
        // Vérifier que le token est valide
        if (!tokens.access_token) {
          console.error("❌ [exchange_code] ========================================");
          console.error("❌ [exchange_code] Access token MANQUANT dans la réponse Google !");
          console.error("❌ [exchange_code] Réponse complète:", JSON.stringify(tokens, null, 2));
          console.error("❌ [exchange_code] ========================================");
          return new Response(
            JSON.stringify({ error: "Access token missing in Google response", response: tokens }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (tokens.access_token.length < 10) {
          console.error("❌ [exchange_code] Access token semble invalide (trop court):", tokens.access_token);
          return new Response(
            JSON.stringify({ error: "Invalid access token received from Google", token_length: tokens.access_token.length }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log("✅ [exchange_code] Token validé avec succès !");
      } catch (e) {
        console.error("❌ [exchange_code] ========================================");
        console.error("❌ [exchange_code] ERREUR LORS DU PARSING DES TOKENS");
        console.error("❌ [exchange_code] ========================================");
        console.error("❌ [exchange_code] Erreur:", e);
        console.error("❌ [exchange_code] Type d'erreur:", typeof e);
        console.error("❌ [exchange_code] Message:", e instanceof Error ? e.message : String(e));
        console.error("❌ [exchange_code] Stack:", e instanceof Error ? e.stack : "No stack");
        console.error("❌ [exchange_code] ========================================");
        
        return new Response(
          JSON.stringify({ error: "Failed to parse token response", details: String(e), error_type: typeof e }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Récupérer les informations du compte Google
      console.log("🔄 [exchange_code] Récupération des infos utilisateur Google...");
      
      // Construire le header Authorization correctement
      // Google utilise toujours "Bearer" pour les access tokens OAuth 2.0
      const tokenType = tokens.token_type || "Bearer";
      const authHeader = `${tokenType} ${tokens.access_token}`;
      
      console.log("🔑 [exchange_code] Préparation requête userinfo:", {
        tokenType: tokenType,
        tokenLength: tokens.access_token.length,
        tokenStart: tokens.access_token.substring(0, 30) + "...",
        headerPreview: authHeader.substring(0, 60) + "...",
        headerLength: authHeader.length,
        url: "https://www.googleapis.com/oauth2/v2/userinfo"
      });
      
      // Vérifier que le token n'est pas vide
      if (!tokens.access_token || tokens.access_token.trim().length === 0) {
        console.error("❌ [exchange_code] Access token est vide !");
        return new Response(
          JSON.stringify({ error: "Access token is empty", tokens_received: Object.keys(tokens) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("📥 [exchange_code] Réponse userinfo:", {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText,
        ok: userInfoResponse.ok
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error("❌ [exchange_code] Erreur lors de la récupération userinfo:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch user info", details: errorText, status: userInfoResponse.status }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let userInfo: any;
      try {
        userInfo = await userInfoResponse.json();
        console.log("✅ [exchange_code] User info reçue:", {
          email: userInfo.email,
          name: userInfo.name,
          id: userInfo.id
        });
      } catch (e) {
        console.error("❌ [exchange_code] Erreur lors du parsing userinfo:", e);
        return new Response(
          JSON.stringify({ error: "Failed to parse user info", details: String(e) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      console.log("📅 [exchange_code] Token expire le:", expiresAt.toISOString());

      // Récupérer le nom de l'entreprise
      console.log("🔄 [exchange_code] Récupération de l'entreprise:", finalCompanyId);
      const { data: company, error: companyError } = await supabaseClient
        .from("companies")
        .select("name")
        .eq("id", finalCompanyId)
        .single();

      if (companyError) {
        console.error("❌ [exchange_code] Erreur lors de la récupération de l'entreprise:", companyError);
        return new Response(
          JSON.stringify({ error: "Company not found", details: companyError }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!company) {
        console.error("❌ [exchange_code] Entreprise non trouvée:", finalCompanyId);
        return new Response(
          JSON.stringify({ error: "Company not found", company_id: finalCompanyId }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [exchange_code] Entreprise trouvée:", company.name);

      // Récupérer le calendar_type depuis le state
      let calendarType = "planning"; // Valeur par défaut
      try {
        const decodedState = JSON.parse(atob(state || ""));
        calendarType = decodedState.calendar_type || "planning";
      } catch (e) {
        console.warn("⚠️ [exchange_code] Impossible de décoder calendar_type depuis state, utilisation de 'planning' par défaut");
      }

      // Définir le nom et description du calendrier selon le type
      const calendarConfig = {
        planning: {
          name: `Planning – ${company.name}`,
          description: `Planning et affectations des employés pour ${company.name}`,
        },
        agenda: {
          name: `Agenda – ${company.name}`,
          description: `Agenda et événements généraux de ${company.name}`,
        },
        events: {
          name: `Événements – ${company.name}`,
          description: `Réunions, deadlines et rappels pour ${company.name}`,
        },
      };

      const config = calendarConfig[calendarType as keyof typeof calendarConfig] || calendarConfig.planning;
      const calendarName = config.name;
      const calendarDescription = config.description;

      console.log("🔄 [exchange_code] Création du calendrier Google:", calendarName);
      console.log("📅 [exchange_code] Type de calendrier:", calendarType);
      
      const calendarResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: calendarName,
          description: calendarDescription,
          timeZone: "Europe/Paris",
        }),
      });

      console.log("📥 [exchange_code] Réponse création calendrier:", {
        status: calendarResponse.status,
        statusText: calendarResponse.statusText,
        ok: calendarResponse.ok
      });

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        let errorDetails: any;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }
        console.error("❌ [exchange_code] Erreur création calendrier Google:", errorDetails);
        return new Response(
          JSON.stringify({ error: "Failed to create Google Calendar", details: errorDetails, status: calendarResponse.status }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let googleCalendar: GoogleCalendar;
      try {
        googleCalendar = await calendarResponse.json();
        console.log("✅ [exchange_code] Calendrier créé:", {
          id: googleCalendar.id,
          summary: googleCalendar.summary
        });
      } catch (e) {
        console.error("❌ [exchange_code] Erreur lors du parsing du calendrier:", e);
        return new Response(
          JSON.stringify({ error: "Failed to parse calendar response", details: String(e) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Enregistrer ou mettre à jour la connexion (avec calendar_type)
      console.log("🔄 [exchange_code] Vérification connexion existante pour ce type...");
      const { data: existingConnection, error: fetchError } = await supabaseClient
        .from("google_calendar_connections")
        .select("*")
        .eq("company_id", finalCompanyId)
        .eq("calendar_type", calendarType)
        .maybeSingle();

      if (fetchError) {
        console.error("❌ [exchange_code] Erreur lors de la vérification connexion existante:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to check existing connection", details: fetchError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("📊 [exchange_code] Connexion existante pour type", calendarType, ":", existingConnection ? "Oui" : "Non");

      const connectionData = {
        company_id: finalCompanyId,
        owner_user_id: user.id,
        google_email: userInfo.email,
        calendar_id: googleCalendar.id,
        calendar_name: calendarName,
        calendar_type: calendarType,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt.toISOString(),
        sync_direction: "app_to_google",
        sync_planning_enabled: true,
        enabled: true,
        updated_at: new Date().toISOString(),
      };

      console.log("💾 [exchange_code] Données à sauvegarder:", {
        company_id: connectionData.company_id,
        user_id: connectionData.user_id,
        owner_user_id: connectionData.owner_user_id,
        google_email: connectionData.google_email,
        calendar_id: connectionData.calendar_id,
        has_access_token: !!connectionData.access_token,
        has_refresh_token: !!connectionData.refresh_token
      });

      let result;
      if (existingConnection) {
        // Mettre à jour la connexion existante
        console.log("🔄 [exchange_code] Mise à jour connexion existante:", existingConnection.id);
        const { data, error } = await supabaseClient
          .from("google_calendar_connections")
          .update(connectionData)
          .eq("id", existingConnection.id)
          .select()
          .single();
        
        result = { data, error };
      } else {
        // Créer une nouvelle connexion
        console.log("🔄 [exchange_code] Création nouvelle connexion...");
        const { data, error } = await supabaseClient
          .from("google_calendar_connections")
          .insert(connectionData)
          .select()
          .single();
        
        result = { data, error };
      }

      if (result.error) {
        console.error("❌ [exchange_code] ========================================");
        console.error("❌ [exchange_code] ERREUR BASE DE DONNÉES");
        console.error("❌ [exchange_code] ========================================");
        console.error("❌ [exchange_code] Error:", JSON.stringify(result.error, null, 2));
        console.error("❌ [exchange_code] Connection Data:", JSON.stringify(connectionData, null, 2));
        console.error("❌ [exchange_code] ========================================");
        return new Response(
          JSON.stringify({ error: "Failed to save connection", details: result.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [exchange_code] Connexion sauvegardée:", result.data?.id);

      // Mettre à jour companies.google_calendar_id
      await supabaseClient
        .from("companies")
        .update({ google_calendar_id: googleCalendar.id })
        .eq("id", finalCompanyId);

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
      const connection_id = (bodyParsed?.connection_id ?? (bodyParsed as any)?.connection_id) as string | undefined;

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
      const connection_id = (bodyParsed?.connection_id ?? (bodyParsed as any)?.connection_id) as string | undefined;

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
    console.error("❌ [ERROR] Unhandled error:", error);
    console.error("❌ [ERROR] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("❌ [ERROR] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : String(error)) : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


