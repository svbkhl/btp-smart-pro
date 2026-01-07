import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Log de démarrage avec URL de production
  console.log("🚀 google-calendar-oauth function started");
  console.log("🌐 Production URL: https://www.btpsmartpro.com");
  console.log("🔗 Supabase Function URL: https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");

    if (!clientId || !redirectUri) {
      console.error("❌ Missing Google env vars");
      console.error("GOOGLE_CLIENT_ID:", !!clientId);
      console.error("GOOGLE_REDIRECT_URI:", !!redirectUri);
      return new Response(
        JSON.stringify({ error: "Google OAuth not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier que redirectUri n'est pas localhost
    if (redirectUri.includes("localhost") || redirectUri.includes("127.0.0.1")) {
      console.error("❌ GOOGLE_REDIRECT_URI contains localhost:", redirectUri);
      return new Response(
        JSON.stringify({ 
          error: "GOOGLE_REDIRECT_URI cannot be localhost in production",
          current_redirect_uri: redirectUri 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer l'utilisateur si authentifié (optionnel pour cette fonction simple)
    let userId: string | null = null;
    let companyId: string | null = null;
    
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        
        if (user) {
          userId = user.id;
          
          // Récupérer le company_id depuis company_users
          const { data: companyUser } = await supabaseClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .maybeSingle();
          
          if (companyUser) {
            companyId = companyUser.company_id;
          }
        }
      }
    } catch (e) {
      // Pas grave si l'auth échoue, on continue sans state
      console.log("⚠️ Could not get user info, continuing without state");
    }

    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
    );

    // Créer le state avec user_id et company_id si disponibles
    let stateParam = "";
    if (userId && companyId) {
      const state = btoa(JSON.stringify({ user_id: userId, company_id: companyId }));
      stateParam = `&state=${encodeURIComponent(state)}`;
    }

    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&scope=${scope}` +
      stateParam;

    console.log("✅ Generated OAuth URL");
    console.log("🔗 Redirect URI (production):", redirectUri);
    console.log("🌐 Frontend URL: https://www.btpsmartpro.com");
    console.log("📋 Callback URL: https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback");

    return new Response(JSON.stringify({ url: authUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ OAuth error", err);
    return new Response(
      JSON.stringify({ error: "OAuth initialization failed", details: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
