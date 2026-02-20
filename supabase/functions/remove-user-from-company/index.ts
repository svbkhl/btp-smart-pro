/**
 * Edge Function : Retirer un utilisateur d'une entreprise
 *
 * 1. Met à jour company_users (status = 'inactive')
 * 2. Si l'utilisateur n'a plus AUCUNE entreprise active → supprime son compte Auth
 *    pour qu'il puisse recréer un compte propre s'il est réinvité
 *
 * Usage:
 * POST /functions/v1/remove-user-from-company
 * Body: { "user_id": "uuid", "company_id": "uuid" }
 * Headers: Authorization: Bearer <owner_token>
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function cleanupAndDeleteAuthUser(adminClient: any, userId: string) {
  // Nettoyer les tables publiques avant suppression auth (éviter FK)
  await adminClient.from("company_users").delete().eq("user_id", userId);
  await adminClient.from("employees").delete().eq("user_id", userId);
  await adminClient.from("user_roles").delete().eq("user_id", userId);
  await adminClient.from("user_settings").delete().eq("user_id", userId);
  await adminClient.from("invitations").delete().eq("user_id", userId);
  await adminClient.from("invitations").delete().eq("invited_by", userId);

  await adminClient.auth.admin.deleteUser(userId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, company_id } = await req.json();
    if (!user_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "user_id and company_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'appelant est owner de cette entreprise
    const { data: cu } = await adminClient
      .from("company_users")
      .select("role")
      .eq("company_id", company_id)
      .eq("user_id", user.id)
      .single();

    if (!cu || cu.role !== "owner") {
      return new Response(JSON.stringify({ error: "Forbidden: Owner only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Mettre à jour company_users (status = inactive)
    const { error: updateErr } = await adminClient
      .from("company_users")
      .update({ status: "inactive" })
      .eq("user_id", user_id)
      .eq("company_id", company_id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update", details: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Compter les autres company_users actifs pour cet utilisateur
    const { data: activeMemberships } = await adminClient
      .from("company_users")
      .select("id")
      .eq("user_id", user_id)
      .or("status.eq.active,status.is.null");

    const hasOtherCompanies = (activeMemberships?.length ?? 0) > 0;

    // 3. Si plus aucune entreprise active → supprimer le compte Auth
    if (!hasOtherCompanies) {
      try {
        await cleanupAndDeleteAuthUser(adminClient, user_id);
        console.log("[remove-user-from-company] Auth account deleted for orphan user:", user_id);
      } catch (e) {
        console.warn("[remove-user-from-company] Auth delete failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        auth_deleted: !hasOtherCompanies,
        message: hasOtherCompanies
          ? "Utilisateur retiré de l'entreprise"
          : "Utilisateur retiré et compte supprimé (pourra recréer un compte s'il est réinvité)",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[remove-user-from-company] Error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
