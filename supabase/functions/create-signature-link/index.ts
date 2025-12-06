/**
 * Edge Function pour créer un lien de signature
 * Génère un UUID unique et crée l'entrée dans la table signatures
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSignatureLinkRequest {
  quote_id?: string;
  invoice_id?: string;
  client_email: string;
  client_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const body: CreateSignatureLinkRequest = await req.json();
    const { quote_id, invoice_id, client_email, client_name } = body;

    if (!client_email) {
      return new Response(
        JSON.stringify({ error: "client_email is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!quote_id && !invoice_id) {
      return new Response(
        JSON.stringify({ error: "quote_id or invoice_id is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Vérifier que le devis/facture appartient à l'utilisateur
    if (quote_id) {
      const { data: quote, error: quoteError } = await supabaseClient
        .from("ai_quotes")
        .select("id, user_id")
        .eq("id", quote_id)
        .eq("user_id", user.id)
        .single();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: "Quote not found or access denied" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        );
      }
    }

    if (invoice_id) {
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from("invoices")
        .select("id, user_id")
        .eq("id", invoice_id)
        .eq("user_id", user.id)
        .single();

      if (invoiceError || !invoice) {
        return new Response(
          JSON.stringify({ error: "Invoice not found or access denied" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        );
      }
    }

    // Générer un ID unique pour le lien
    const signatureId = crypto.randomUUID();
    
    // Construire l'URL de base (depuis les variables d'environnement ou utiliser une valeur par défaut)
    const baseUrl = Deno.env.get("VITE_APP_URL") || "https://votre-app.com";
    const signatureLink = `${baseUrl}/signature/${signatureId}`;

    console.log("📝 [create-signature-link] Création du lien:", {
      signatureId,
      signatureLink,
      quoteId: quote_id,
      invoiceId: invoice_id,
    });

    // Créer l'entrée dans la table signatures
    const { data: signature, error: insertError } = await supabaseClient
      .from("signatures")
      .insert({
        id: signatureId,
        quote_id: quote_id || null,
        invoice_id: invoice_id || null,
        client_email,
        client_name: client_name || null,
        signature_link: signatureLink,
        signed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ [create-signature-link] Erreur insertion:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create signature link", details: insertError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("✅ [create-signature-link] Lien créé:", signature.id);

    return new Response(
      JSON.stringify({
        success: true,
        signature_id: signature.id,
        signature_link: signature.signature_link,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ [create-signature-link] Erreur:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});



