// Edge Function pour créer une session de signature
// Génère un token sécurisé et retourne une URL publique

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { invoice_id, quote_id, signer_email, signer_name } = await req.json();

    if (!signer_email) {
      return new Response(
        JSON.stringify({ error: "signer_email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID() + "-" + Date.now().toString(36);
    
    // Expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create signature session
    const { data: session, error: sessionError } = await supabaseClient
      .from("signature_sessions")
      .insert({
        user_id: user.id,
        invoice_id: invoice_id || null,
        quote_id: quote_id || null,
        token: token,
        signer_email: signer_email,
        signer_name: signer_name || null,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating signature session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create signature session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer l'URL de base depuis les user_settings
    const { data: userSettings } = await supabaseClient
      .from("user_settings")
      .select("app_base_url")
      .eq("user_id", user.id)
      .single();

    // Fonction pour vérifier si une URL est valide (pas localhost)
    const isValidProductionUrl = (url: string | null | undefined): boolean => {
      if (!url) return false;
      const lowerUrl = url.toLowerCase();
      return !lowerUrl.includes("localhost") && 
             !lowerUrl.includes("127.0.0.1") && 
             !lowerUrl.includes("0.0.0.0") &&
             !lowerUrl.includes("192.168.") &&
             !lowerUrl.includes("10.0.") &&
             (lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://"));
    };

    // Generate public URL - utiliser l'URL de production, JAMAIS localhost
    // 1. Priorité 1 : user_settings.app_base_url (si valide et pas localhost)
    let baseUrl: string | null = null;
    if (userSettings?.app_base_url && isValidProductionUrl(userSettings.app_base_url)) {
      baseUrl = userSettings.app_base_url.trim();
      console.log("✅ URL depuis user_settings:", baseUrl);
    }
    
    // 2. Priorité 2 : Variables d'environnement (PUBLIC_URL, PRODUCTION_URL, VITE_PUBLIC_URL)
    if (!baseUrl || !isValidProductionUrl(baseUrl)) {
      const envUrls = [
        Deno.env.get("PUBLIC_URL"),
        Deno.env.get("PRODUCTION_URL"),
        Deno.env.get("VITE_PUBLIC_URL"),
        Deno.env.get("NEXT_PUBLIC_URL"),
      ].filter(isValidProductionUrl);
      
      if (envUrls.length > 0) {
        baseUrl = envUrls[0];
        console.log("✅ URL depuis variable d'environnement:", baseUrl);
      }
    }
    
    // 3. Priorité 3 : Essayer depuis les headers (UNIQUEMENT si pas localhost)
    if (!baseUrl || !isValidProductionUrl(baseUrl)) {
      const origin = req.headers.get("Origin") || req.headers.get("Referer");
      if (origin) {
        try {
          const originUrl = new URL(origin).origin;
          if (isValidProductionUrl(originUrl)) {
            baseUrl = originUrl;
            console.log("✅ URL depuis headers:", baseUrl);
          } else {
            console.warn("⚠️ Origin/Referer contient localhost, ignoré:", originUrl);
          }
        } catch (e) {
          console.warn("⚠️ Impossible de parser Origin/Referer:", origin);
        }
      }
    }
    
    // 4. Priorité 4 : Construire depuis SUPABASE_URL si disponible
    if (!baseUrl || !isValidProductionUrl(baseUrl)) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (supabaseUrl && !supabaseUrl.includes("localhost")) {
        // Extraire le nom du projet Supabase et construire l'URL Vercel
        const projectMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
        if (projectMatch) {
          const projectName = projectMatch[1];
          baseUrl = `https://${projectName}.vercel.app`;
          console.log("✅ URL construite depuis SUPABASE_URL:", baseUrl);
        }
      }
    }
    
    // 5. Dernière priorité : URL par défaut (NE JAMAIS utiliser localhost)
    if (!baseUrl || !isValidProductionUrl(baseUrl)) {
      console.error("❌ Aucune URL de production valide trouvée !");
      console.error("   - app_base_url dans user_settings:", userSettings?.app_base_url);
      console.error("   - PUBLIC_URL:", Deno.env.get("PUBLIC_URL"));
      console.error("   - PRODUCTION_URL:", Deno.env.get("PRODUCTION_URL"));
      console.error("   - Origin:", req.headers.get("Origin"));
      console.error("   - Referer:", req.headers.get("Referer"));
      
      // Utiliser une URL par défaut mais afficher un avertissement fort
      baseUrl = "https://votre-domaine.vercel.app";
      console.warn("⚠️⚠️⚠️ ATTENTION: Utilisation d'une URL par défaut !");
      console.warn("   Configurez app_base_url dans Paramètres > Entreprise");
      console.warn("   OU définissez PUBLIC_URL dans les secrets Supabase Edge Functions");
    }
    
    // Nettoyer l'URL : s'assurer qu'elle commence par https://
    if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Supprimer le trailing slash
    baseUrl = baseUrl?.replace(/\/$/, '');
    
    const signatureUrl = `${baseUrl}/sign/${token}`;
    console.log("🔗 URL de signature finale générée:", signatureUrl);
    
    // Vérification finale de sécurité
    if (signatureUrl.includes("localhost") || signatureUrl.includes("127.0.0.1")) {
      console.error("❌ ERREUR CRITIQUE: L'URL de signature contient localhost !");
      throw new Error("Configuration invalide: l'URL de signature ne peut pas être localhost. Configurez app_base_url dans les paramètres.");
    }

    // Update invoice/quote with signature URL if provided
    if (invoice_id) {
      await supabaseClient
        .from("invoices")
        .update({
          signature_url: signatureUrl,
          signature_token: token,
          status: "sent",
        })
        .eq("id", invoice_id)
        .eq("user_id", user.id);
    } else if (quote_id) {
      await supabaseClient
        .from("ai_quotes")
        .update({
          status: "sent",
        })
        .eq("id", quote_id)
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        signature_url: signatureUrl,
        token: token,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-signature-session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

