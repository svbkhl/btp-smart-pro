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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const {
      nom,
      prenom,
      email,
      telephone,
      poste_souhaite,
      lettre_motivation,
      cv_url,
    } = await req.json();

    // Validation
    if (!nom || !prenom || !email || !poste_souhaite) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: nom, prenom, email, poste_souhaite",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate a simple matching score (can be enhanced with AI later)
    // For now, we'll use a basic score based on completeness
    let score = 50; // Base score
    if (lettre_motivation && lettre_motivation.length > 100) score += 20;
    if (cv_url) score += 20;
    if (telephone) score += 10;
    score = Math.min(100, score); // Cap at 100

    // Insert candidature
    const { data: candidature, error: insertError } = await supabase
      .from("candidatures")
      .insert({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        telephone: telephone?.trim() || null,
        poste_souhaite: poste_souhaite.trim(),
        lettre_motivation: lettre_motivation?.trim() || null,
        cv_url: cv_url || null,
        statut: "en_attente",
        score_correspondance: score,
        date_candidature: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting candidature:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create RH activity
    try {
      await supabase.from("rh_activities").insert({
        type_activite: "candidature",
        titre: `Nouvelle candidature de ${prenom} ${nom}`,
        description: `Candidature pour le poste de ${poste_souhaite}`,
        candidature_id: candidature.id,
      });
    } catch (activityError) {
      // Log but don't fail if activity creation fails
      console.warn("Error creating RH activity:", activityError);
    }

    // Send success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Candidature enregistrée avec succès",
        candidature_id: candidature.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in submit-candidature function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


