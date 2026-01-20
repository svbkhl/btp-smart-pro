/**
 * Edge Function : Créer une invitation d'entreprise
 * 
 * Sécurité :
 * - Vérifie que l'inviteur est owner/admin de la company
 * - Génère un token sécurisé (32 bytes random)
 * - Hash le token avec SHA256 avant stockage
 * - Envoie l'email avec le token en clair (dans le lien uniquement)
 * 
 * Usage:
 * POST /functions/v1/create-company-invite
 * Body: { company_id, email, role }
 * Headers: Authorization: Bearer <user_jwt>
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

interface CreateInviteRequest {
  company_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
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
    const appUrl = Deno.env.get("APP_URL") || "https://btpsmartpro.com";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "contact@btpsmartpro.com";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer l'utilisateur depuis le JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parser le body
    let body: CreateInviteRequest;
    try {
      const bodyText = await req.text();
      console.log("📥 Raw request body:", bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ 
            error: "Empty request body",
            message: "Le corps de la requête est vide",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      console.error("❌ Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          message: "Format de données invalide",
          details: parseError.message 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id, email, role } = body;

    console.log("📥 Received invite request:", { 
      company_id: company_id || null, 
      email: email || null, 
      role: role || null,
      company_id_type: typeof company_id,
      company_id_length: company_id?.length || 0,
      has_company_id: !!company_id
    });

    // Validation des champs requis avec messages détaillés
    if (!company_id || (typeof company_id === 'string' && company_id.trim() === '')) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: company_id",
          message: "L'ID de l'entreprise est requis",
          details: `company_id reçu: ${company_id} (type: ${typeof company_id})`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || (typeof email === 'string' && email.trim() === '')) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: email",
          message: "L'email est requis",
          details: `email reçu: ${email}`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!role || (typeof role === 'string' && role.trim() === '')) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: role",
          message: "Le rôle est requis",
          details: `role reçu: ${role}`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['owner', 'admin', 'member'].includes(role)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid role. Must be 'owner', 'admin' or 'member'",
          message: `Le rôle "${role}" n'est pas valide. Les rôles valides sont: owner, admin, member`,
          details: `role reçu: ${role}`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normaliser l'email
    const normalizedEmail = email.toLowerCase().trim();

    // Créer le client admin pour les opérations sécurisées
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Vérifier que l'utilisateur est owner/admin de la company
    const { data: membership, error: membershipError } = await adminClient
      .from('company_users')
      .select('role')
      .eq('company_id', company_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "You must be owner or admin of this company to invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    // D'abord, chercher si un compte existe avec cet email
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (existingUser) {
      // Vérifier si cet utilisateur est déjà membre de la company
      const { data: existingMember } = await adminClient
        .from('company_users')
        .select('id')
        .eq('company_id', company_id)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "User is already a member of this company" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Vérifier qu'il n'y a pas déjà une invitation pending pour cet email
    const { data: existingInvite } = await adminClient
      .from('company_invites')
      .select('id')
      .eq('company_id', company_id)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "An invitation is already pending for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer les infos de la company
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Générer un token sécurisé (32 bytes = 64 caractères hex)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Hasher le token avec SHA256
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Date d'expiration (7 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Créer l'invitation dans la base de données
    const { data: invite, error: inviteError } = await adminClient
      .from('company_invites')
      .insert({
        company_id,
        email: normalizedEmail,
        role,
        token_hash: tokenHashHex,
        invited_by: user.id,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation", details: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construire le lien d'invitation
    const inviteUrl = `${appUrl}/invite/accept?invite_id=${invite.id}&token=${token}`;

    // Envoyer l'email d'invitation
    if (resendApiKey) {
      const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation - ${company.name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Invitation à rejoindre ${company.name}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Bonjour,</p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Vous avez été invité à rejoindre <strong>${company.name}</strong> sur BTP Smart Pro.
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Rôle proposé : <strong>${role === 'owner' ? 'Dirigeant' : role === 'admin' ? 'Administrateur' : 'Membre'}</strong>
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #333;">
                Cliquez sur le bouton ci-dessous pour créer votre compte et rejoindre l'entreprise :
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Accepter l'invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #666;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999; word-break: break-all;">
                ${inviteUrl}
              </p>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #666;">
                Ce lien est valide pendant 7 jours. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                <strong>BTP Smart Pro</strong><br>
                Votre partenaire pour la gestion de vos projets BTP
              </p>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #999;">
                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [normalizedEmail],
            subject: `Invitation à rejoindre ${company.name} - BTP Smart Pro`,
            html: emailHtml,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          console.error("Resend API error:", errorText);
          // Ne pas échouer si l'email échoue, l'invitation est créée
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Ne pas échouer si l'email échoue
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation créée avec succès",
        invite_id: invite.id,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-company-invite:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
