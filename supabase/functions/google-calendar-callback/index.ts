// ============================================================================
// 🔗 GOOGLE CALENDAR OAUTH CALLBACK
// ============================================================================
// Description: Gère le callback OAuth après autorisation Google
// Redirige TOUJOURS vers des URLs fixes (jamais undefined)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// URLs FRONT FIXES - JAMAIS undefined, JAMAIS dynamiques
// Utiliser /settings avec tab=integrations pour éviter les problèmes de routing
const FRONT_SUCCESS_URL =
  "https://www.btpsmartpro.com/settings?tab=integrations&google_calendar_status=success";

const FRONT_ERROR_URL =
  "https://www.btpsmartpro.com/settings?tab=integrations&google_calendar_status=error";

serve(async (req) => {
  console.log("🚀 google-calendar-callback called");
  console.log("🔗 Request URL:", req.url);
  console.log("🌐 Frontend URL:", FRONT_SUCCESS_URL);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state");
    
    console.log("📋 OAuth callback params:");
    console.log("  - code:", code ? "present" : "missing");
    console.log("  - error:", error || "none");
    console.log("  - state:", state ? "present" : "missing");

    // Si erreur Google → Redirection FIXE vers FRONT_ERROR_URL
    if (error) {
      console.error("❌ Google OAuth error:", error);
      const errorDescription = url.searchParams.get("error_description") || error;
      
      // Construire l'URL d'erreur avec paramètres
      const errorUrl = new URL(FRONT_ERROR_URL);
      errorUrl.searchParams.set("error", error);
      if (errorDescription) {
        errorUrl.searchParams.set("error_description", encodeURIComponent(errorDescription));
      }
      if (state) {
        errorUrl.searchParams.set("state", state);
      }
      
      const finalErrorUrl = errorUrl.toString();
      console.log("❌ Redirecting to error URL:", finalErrorUrl);
      
      // REDIRECTION FIXE - JAMAIS undefined
      return Response.redirect(finalErrorUrl, 302);
    }

    // Si pas de code → Redirection FIXE vers FRONT_ERROR_URL
    if (!code) {
      console.error("❌ No authorization code received");
      const errorUrl = new URL(FRONT_ERROR_URL);
      errorUrl.searchParams.set("error", "no_code");
      errorUrl.searchParams.set("error_description", encodeURIComponent("No authorization code received from Google"));
      
      const finalErrorUrl = errorUrl.toString();
      console.log("❌ Redirecting to error URL (no code):", finalErrorUrl);
      
      // REDIRECTION FIXE - JAMAIS undefined
      return Response.redirect(finalErrorUrl, 302);
    }

    // Décoder le state si présent
    let userId: string | null = null;
    let companyId: string | null = null;
    
    if (state) {
      try {
        const decodedState = JSON.parse(atob(state));
        userId = decodedState.user_id || null;
        companyId = decodedState.company_id || null;
      } catch (e) {
        console.warn("⚠️ Could not decode state:", e);
      }
    }

    // Construire l'URL de succès avec paramètres
    const successUrl = new URL(FRONT_SUCCESS_URL);
    successUrl.searchParams.set("code", code);
    
    if (state) {
      successUrl.searchParams.set("state", state);
    }
    // Ne pas ajouter user_id et company_id dans l'URL pour éviter les problèmes

    const finalSuccessUrl = successUrl.toString();
    console.log("✅ Redirecting to success URL with OAuth code");
    console.log("🔗 Final redirect URL:", finalSuccessUrl);
    console.log("🌐 Base URL:", FRONT_SUCCESS_URL);
    console.log("📋 Code present:", !!code);
    console.log("📋 State present:", !!state);
    
    // Vérifier que l'URL est valide avant redirection
    if (!finalSuccessUrl || finalSuccessUrl.includes("undefined")) {
      console.error("❌ CRITICAL: Invalid redirect URL detected:", finalSuccessUrl);
      const fallbackUrl = FRONT_ERROR_URL + "?error=invalid_redirect&error_description=" + encodeURIComponent("Invalid redirect URL generated");
      return Response.redirect(fallbackUrl, 302);
    }
    
    // REDIRECTION FIXE - JAMAIS undefined
    return Response.redirect(finalSuccessUrl, 302);
    
  } catch (err) {
    console.error("❌ Callback error", err);
    
    // En cas d'exception → Redirection FIXE vers FRONT_ERROR_URL
    const errorUrl = new URL(FRONT_ERROR_URL);
    errorUrl.searchParams.set("error", "callback_failed");
    errorUrl.searchParams.set("error_description", encodeURIComponent(
      err instanceof Error ? err.message : "Unknown error"
    ));
    
    const finalErrorUrl = errorUrl.toString();
    console.log("❌ Redirecting to error URL (exception):", finalErrorUrl);
    
    // REDIRECTION FIXE - JAMAIS undefined
    return Response.redirect(finalErrorUrl, 302);
  }
});
