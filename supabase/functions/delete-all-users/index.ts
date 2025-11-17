// Edge Function pour supprimer tous les utilisateurs
// ⚠️ ATTENTION : Cette fonction supprime TOUS les utilisateurs !
// Utilisez-la uniquement en développement

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase avec la clé de service (admin)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Récupérer tous les utilisateurs
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    if (!users || users.users.length === 0) {
      return new Response(
        JSON.stringify({ message: "Aucun utilisateur à supprimer", deleted: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Supprimer tous les utilisateurs
    const userIds = users.users.map((u) => u.id);
    let deletedCount = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          errors.push(`Erreur pour ${userId}: ${deleteError.message}`);
        } else {
          deletedCount++;
        }
      } catch (err) {
        errors.push(`Erreur pour ${userId}: ${err.message}`);
      }
    }

    // Supprimer aussi tous les rôles dans user_roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000"); // Supprimer tous sauf un ID impossible

    return new Response(
      JSON.stringify({
        message: "Suppression terminée",
        deleted: deletedCount,
        total: userIds.length,
        errors: errors.length > 0 ? errors : undefined,
        rolesDeleted: !rolesError,
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

