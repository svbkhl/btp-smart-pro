/**
 * Edge Function : Vérifier une invitation
 * 
 * Sécurité :
 * - Hash le token et compare avec token_hash
 * - Vérifie statut = pending
 * - Vérifie expiration
 * - Retourne uniquement les infos minimales nécessaires (pas de fuite de données)
 * 
 * Usage:
 * POST /functions/v1/verify-invite
 * Body: { invite_id, token }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyInviteRequest {
  invite_id: string;
  token: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: VerifyInviteRequest = await req.json();
    const { invite_id, token } = body;

    if (!invite_id || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invite_id, token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Récupérer l'invitation
    const { data: invite, error: inviteError } = await adminClient
      .from('company_invites')
      .select(`
        id,
        company_id,
        email,
        role,
        status,
        expires_at,
        companies!inner(name)
      `)
      .eq('id', invite_id)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier le statut
    if (invite.status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: "Invitation already processed",
          status: invite.status,
          message: invite.status === 'accepted' 
            ? "Cette invitation a déjà été acceptée"
            : invite.status === 'revoked'
            ? "Cette invitation a été révoquée"
            : "Cette invitation a expiré"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier l'expiration
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      // Marquer comme expirée
      await adminClient
        .from('company_invites')
        .update({ status: 'expired' })
        .eq('id', invite_id);

      return new Response(
        JSON.stringify({
          error: "Invitation expired",
          message: "Cette invitation a expiré. Veuillez demander une nouvelle invitation."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hasher le token fourni et comparer avec token_hash
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Récupérer le token_hash de la base
    const { data: inviteWithHash, error: hashError } = await adminClient
      .from('company_invites')
      .select('token_hash')
      .eq('id', invite_id)
      .single();

    if (hashError || !inviteWithHash) {
      return new Response(
        JSON.stringify({ error: "Failed to verify token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Comparer les hash
    if (tokenHashHex !== inviteWithHash.token_hash) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Token valide - retourner les infos minimales nécessaires
    return new Response(
      JSON.stringify({
        valid: true,
        company_name: (invite.companies as any)?.name,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-invite:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
