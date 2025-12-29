/**
 * Configuration CORS sécurisée pour Edge Functions
 */

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [
  "https://btpsmartpro.com",
  "https://www.btpsmartpro.com",
];

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

  // En développement, autoriser localhost
  if (IS_DEVELOPMENT && origin.includes("localhost")) {
    return origin;
  }

  // Vérifier si l'origine est dans la liste autorisée
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
 */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}



