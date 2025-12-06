/**
 * Edge Function pour vérifier la configuration Resend
 * Utile pour déboguer les problèmes de configuration
 * 
 * Déployer avec: supabase functions deploy verify-resend-config
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
    const FROM_NAME = Deno.env.get("FROM_NAME");

    const checks = {
      RESEND_API_KEY: {
        configured: !!RESEND_API_KEY,
        isProduction: RESEND_API_KEY ? !RESEND_API_KEY.includes("test") : false,
        preview: RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 10)}...` : "NON CONFIGURÉ",
      },
      RESEND_FROM_EMAIL: {
        configured: !!RESEND_FROM_EMAIL,
        domain: RESEND_FROM_EMAIL ? RESEND_FROM_EMAIL.split("@")[1] : null,
        isVerifiedDomain: RESEND_FROM_EMAIL ? RESEND_FROM_EMAIL.includes("@btpsmartpro.com") : false,
        value: RESEND_FROM_EMAIL || "NON CONFIGURÉ",
      },
      FROM_NAME: {
        configured: !!FROM_NAME,
        value: FROM_NAME || "NON CONFIGURÉ",
      },
    };

    const allGood = 
      checks.RESEND_API_KEY.configured &&
      checks.RESEND_API_KEY.isProduction &&
      checks.RESEND_FROM_EMAIL.configured &&
      checks.RESEND_FROM_EMAIL.isVerifiedDomain;

    return new Response(
      JSON.stringify({
        status: allGood ? "✅ Configuration correcte" : "⚠️ Configuration incomplète",
        checks,
        recommendations: [
          !checks.RESEND_API_KEY.configured && "Configurez RESEND_API_KEY dans Supabase Secrets",
          checks.RESEND_API_KEY.configured && !checks.RESEND_API_KEY.isProduction && "Utilisez une clé API de PRODUCTION (pas de test)",
          !checks.RESEND_FROM_EMAIL.configured && "Configurez RESEND_FROM_EMAIL dans Supabase Secrets",
          checks.RESEND_FROM_EMAIL.configured && !checks.RESEND_FROM_EMAIL.isVerifiedDomain && "RESEND_FROM_EMAIL doit utiliser le domaine vérifié @btpsmartpro.com",
        ].filter(Boolean),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || "Erreur lors de la vérification",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

