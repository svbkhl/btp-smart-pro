/**
 * Edge Function : Accepter une invitation
 * 
 * Sécurité :
 * - Vérifie token hash, statut, expiration
 * - Gère compte existant vs nouveau compte
 * - Crée user si nécessaire
 * - Ajoute à company_users
 * - Met à jour company_invites
 * - Anti-doublons strict
 * 
 * Usage:
 * POST /functions/v1/accept-invite
 * Body: { invite_id, token, first_name, last_name, password? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "3600",
};

interface AcceptInviteRequest {
  invite_id: string;
  token: string;
  first_name: string;
  last_name: string;
  password?: string; // Optionnel si compte existe déjà
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
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

    const body: AcceptInviteRequest = await req.json();
    let { invite_id, token, first_name, last_name, password } = body;

    // Normaliser les données d'entrée
    first_name = first_name?.trim() || '';
    last_name = last_name?.trim() || '';
    password = password?.trim() || '';

    console.log("📥 [accept-invite] Received request:", {
      invite_id: invite_id || null,
      token_length: token?.length || 0,
      first_name: first_name || null,
      last_name: last_name || null,
      password_length: password?.length || 0,
      has_password: !!password,
    });

    if (!invite_id || !token || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invite_id, token, first_name, last_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Email du compte administrateur : les invitations envoyées par lui donnent le rôle dirigeant (owner)
    const ADMIN_OWNER_EMAIL = "sabri.khalfallah6@gmail.com";

    // Récupérer l'invitation (avec invited_by pour détecter l'inviteur)
    const { data: invite, error: inviteError } = await adminClient
      .from('company_invites')
      .select(`
        id,
        company_id,
        email,
        role,
        status,
        expires_at,
        token_hash,
        invited_by,
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

    // Vérifier le token hash
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (tokenHashHex !== invite.token_hash) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = invite.email.toLowerCase().trim();

    // Vérifier si un compte existe déjà pour cet email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Compte existant
      userId = existingUser.id;

      // Vérifier si l'utilisateur est déjà membre de cette company
      const { data: existingMember } = await adminClient
        .from('company_users')
        .select('id')
        .eq('company_id', invite.company_id)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        // Déjà membre - mettre à jour l'invitation comme acceptée mais ne pas dupliquer
        await adminClient
          .from('company_invites')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: userId,
          })
          .eq('id', invite_id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Vous êtes déjà membre de cette entreprise",
            user_id: userId,
            already_member: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // L'utilisateur existe mais n'est pas membre - ajouter à company_users
    } else {
      // Nouveau compte - créer l'utilisateur
      if (!password || password.length < 8) {
        console.error("❌ [accept-invite] Password validation failed:", {
          has_password: !!password,
          password_length: password?.length || 0,
        });
        return new Response(
          JSON.stringify({ error: "Password required and must be at least 8 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("🔐 [accept-invite] Creating new user:", {
        email: normalizedEmail,
        password_length: password.length,
        first_name,
        last_name,
      });

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true, // Auto-confirmer l'email
        user_metadata: {
          first_name,
          last_name,
          full_name: `${first_name} ${last_name}`,
        },
      });

      if (createError || !newUser.user) {
        console.error("❌ [accept-invite] Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user", details: createError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [accept-invite] User created successfully:", {
        user_id: newUser.user.id,
        email: newUser.user.email,
        email_confirmed: newUser.user.email_confirmed_at ? true : false,
      });

      userId = newUser.user.id;
      isNewUser = true;
    }

    // Rôle effectif : celui stocké dans l'invitation (owner=dirigeant, admin, member) ou fallback si invité par l'admin propriétaire
    let effectiveRoleSlug: 'owner' | 'admin' | 'employee' =
      invite.role === 'owner' ? 'owner'
      : invite.role === 'admin' ? 'admin'
      : 'employee';
    let effectiveRoleLabel: 'owner' | 'admin' | 'member' =
      invite.role === 'owner' ? 'owner'
      : invite.role === 'admin' ? 'admin'
      : 'member';

    if (effectiveRoleSlug === 'owner') {
      console.log("✅ [accept-invite] Invitation en tant que dirigeant (owner) : rôle attribué");
    }
    if (effectiveRoleLabel !== 'owner' && invite.invited_by) {
      try {
        const { data: { user: inviterUser } } = await adminClient.auth.admin.getUserById(invite.invited_by);
        const inviterEmail = (inviterUser?.email || '').toLowerCase().trim();
        if (inviterEmail === ADMIN_OWNER_EMAIL.toLowerCase()) {
          effectiveRoleSlug = 'owner';
          effectiveRoleLabel = 'owner';
          console.log("✅ [accept-invite] Invitation envoyée par le compte administrateur : rôle dirigeant (owner) attribué");
        }
      } catch (e) {
        console.warn("⚠️ [accept-invite] Impossible de récupérer l'inviteur:", e);
      }
    }

    // Récupérer le role_id depuis la table roles (company_id + slug)
    const { data: roleData } = await adminClient
      .from('roles')
      .select('id')
      .eq('company_id', invite.company_id)
      .eq('slug', effectiveRoleSlug)
      .maybeSingle();

    // Ajouter à company_users (UPSERT pour éviter doublons)
    const { error: companyUserError } = await adminClient
      .from('company_users')
      .upsert({
        company_id: invite.company_id,
        user_id: userId,
        role: effectiveRoleLabel,
        role_id: roleData?.id || null,
        status: 'active',
      }, {
        onConflict: 'company_id,user_id'
      });

    if (companyUserError) {
      console.error("Error adding user to company:", companyUserError);
      // Si c'est un nouveau user, on pourrait le supprimer, mais on continue
      return new Response(
        JSON.stringify({ error: "Failed to add user to company", details: companyUserError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mettre à jour l'invitation
    const { error: updateError } = await adminClient
      .from('company_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invite_id);

    if (updateError) {
      console.error("Error updating invite:", updateError);
      // Ne pas échouer, l'utilisateur est déjà ajouté
    }

    const responseData = {
      success: true,
      message: "Invitation acceptée avec succès",
      user_id: userId,
      is_new_user: isNewUser,
      company_id: invite.company_id,
      company_name: (invite.companies as any)?.name,
      role: effectiveRoleLabel,
      // Pour nouveau user, retourner les infos pour connexion
      ...(isNewUser && {
        email: normalizedEmail,
        // Important: Ne jamais retourner le mot de passe dans la réponse
        // Le frontend devra utiliser le mot de passe qu'il a envoyé dans la requête
        password_saved: true, // Confirmation que le mot de passe a été enregistré
      }),
    };

    console.log("✅ [accept-invite] Invitation acceptée avec succès:", {
      user_id: userId,
      is_new_user: isNewUser,
      email: isNewUser ? normalizedEmail : 'existing_user',
      company_name: (invite.companies as any)?.name,
    });

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in accept-invite:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
