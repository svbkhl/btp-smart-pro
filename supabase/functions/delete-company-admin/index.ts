/**
 * Edge Function : Supprimer une entreprise (admin)
 *
 * 1. Récupère les user_ids des membres de cette entreprise
 * 2. Pour chaque user sans autre entreprise active → marque pour suppression auth
 * 3. Supprime l'entreprise (CASCADE supprime company_users)
 * 4. Pour chaque utilisateur orphelin → supprime le compte Auth
 *    (pour qu'ils puissent recréer un compte s'ils sont réinvités)
 *
 * Usage:
 * POST /functions/v1/delete-company-admin
 * Body: { "company_id": "uuid" }
 * Headers: Authorization: Bearer <admin_token>
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ["sabri.khalfallah6@gmail.com", "sabri.khalallah6@gmail.com", "khalfallahs.ndrc@gmail.com"];

async function cleanupAndDeleteAuthUser(adminClient: any, userId: string) {
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

    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Récupérer les user_ids des membres de cette entreprise
    const { data: members } = await adminClient
      .from("company_users")
      .select("user_id")
      .eq("company_id", company_id);

    const userIds = [...new Set((members || []).map((m: any) => m.user_id))];

    // 2. Pour chaque user, vérifier s'il a d'AUTRES entreprises (status actif)
    const orphanUserIds: string[] = [];
    for (const uid of userIds) {
      const { data: other } = await adminClient
        .from("company_users")
        .select("id")
        .eq("user_id", uid)
        .neq("company_id", company_id)
        .or("status.eq.active,status.is.null");

      if (!other || other.length === 0) {
        orphanUserIds.push(uid);
      }
    }

    // 3. Supprimer l'entreprise (CASCADE supprime company_users de cette entreprise)
    const { error: deleteErr } = await adminClient.from("companies").delete().eq("id", company_id);

    if (deleteErr) {
      return new Response(
        JSON.stringify({ error: "Failed to delete company", details: deleteErr.message }),
        { status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Supprimer les comptes Auth des utilisateurs orphelins
    for (const uid of orphanUserIds) {
      try {
        await cleanupAndDeleteAuthUser(adminClient, uid);
        console.log("[delete-company-admin] Auth deleted for orphan:", uid);
      } catch (e) {
        console.warn("[delete-company-admin] Auth delete failed for", uid, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        auth_deleted_count: orphanUserIds.length,
        message: `Entreprise supprimée. ${orphanUserIds.length} compte(s) utilisateur supprimé(s) (pourront recréer s'ils sont réinvités).`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[delete-company-admin] Error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
