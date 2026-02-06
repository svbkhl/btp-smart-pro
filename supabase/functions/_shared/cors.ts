/**
 * Configuration CORS sécurisée pour Edge Functions
 */

const ENV_ORIGINS = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((o) => o.trim()).filter(Boolean) || [];
const DEFAULT_ORIGINS = [
  "https://btpsmartpro.com",
  "https://www.btpsmartpro.com",
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4000",
  "http://127.0.0.1:5173",
];
const ALLOWED_ORIGINS = ENV_ORIGINS.length > 0 ? ENV_ORIGINS : DEFAULT_ORIGINS;

const IS_DEVELOPMENT = Deno.env.get("ENVIRONMENT") !== "production";

/**
 * Headers CORS de base
 */
export const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

/**
 * Détermine l'origine autorisée pour une requête
 */
function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) {
    return IS_DEVELOPMENT ? "*" : null;
  }

  // Autoriser localhost / 127.0.0.1 pour le développement local
  if (origin.startsWith("http://localhost") || origin.startsWith("https://localhost") ||
      origin.startsWith("http://127.0.0.1") || origin.startsWith("https://127.0.0.1")) {
    return origin;
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  return null;
}

/**
 * Crée les headers CORS pour une réponse
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = getAllowedOrigin(origin);
  
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigin || "",
  };
}

/**
 * Gère les requêtes OPTIONS (preflight)
 * Status 200 utilisé pour une meilleure compatibilité avec certains proxies/gateways
 */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}



