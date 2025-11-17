// Edge Function pour purger les données de démo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const tables = [
      'clients',
      'projects',
      'ai_quotes',
      'notifications',
      'employees',
      'candidatures',
      'taches_rh',
      'rh_activities',
      'employee_performances'
    ];

    let totalDeleted = 0;
    const results: Record<string, number> = {};

    for (const table of tables) {
      const { data, error } = await supabaseClient
        .from(table)
        .delete()
        .eq('is_demo', true)
        .select();

      if (error && !error.message.includes('does not exist')) {
        console.error(`Erreur sur ${table}:`, error);
      } else {
        const count = data?.length || 0;
        totalDeleted += count;
        results[table] = count;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Données de démo supprimées avec succès',
        deleted: totalDeleted,
        details: results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

