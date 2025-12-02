/**
 * Send Invitation Edge Function
 * 
 * Envoie une invitation par email à un utilisateur pour rejoindre une entreprise
 * Utilisé par l'admin pour inviter des dirigeants
 * Utilisé par les dirigeants pour inviter des employés
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Récupérer l'utilisateur depuis le header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Vérifier que l'utilisateur est admin ou dirigeant
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = userRole?.role === 'administrateur';
    const isOwner = userRole?.role === 'dirigeant';

    if (!isAdmin && !isOwner) {
      throw new Error('Forbidden: Admin or owner access required');
    }

    // Parser le body
    const body = await req.json();
    const { email, company_id, role = 'member' } = body;

    if (!email || !company_id) {
      throw new Error('Email and company_id are required');
    }

    // Vérifier que l'entreprise existe
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('id, name')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Si c'est un dirigeant, vérifier qu'il peut inviter dans cette entreprise
    if (isOwner && !isAdmin) {
      const { data: companyUser } = await supabaseClient
        .from('company_users')
        .select('role')
        .eq('company_id', company_id)
        .eq('user_id', user.id)
        .single();

      if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
        throw new Error('Forbidden: You can only invite users to your own company');
      }
    }

    // Vérifier qu'il n'y a pas déjà une invitation en cours pour cet email
    const { data: existingInvitation } = await supabaseClient
      .from('invitations')
      .select('id, status')
      .eq('email', email)
      .eq('company_id', company_id)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Une invitation est déjà en cours pour cet email');
    }

    // Générer un token unique
    const token = crypto.randomUUID() + '-' + Date.now().toString(36);
    
    // Date d'expiration (7 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Créer l'invitation
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .insert({
        email,
        company_id,
        role,
        invited_by: user.id,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }

    // Construire l'URL d'invitation
    const baseUrl = Deno.env.get('PUBLIC_URL') || 
                   Deno.env.get('PRODUCTION_URL') || 
                   'http://localhost:3000';
    
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

    // Envoyer l'email d'invitation
    const emailSubject = role === 'owner' 
      ? `Invitation à rejoindre ${company.name} en tant que dirigeant`
      : `Invitation à rejoindre ${company.name}`;

    const emailBody = `
      <h2>Invitation à rejoindre ${company.name}</h2>
      <p>Vous avez été invité à rejoindre l'entreprise <strong>${company.name}</strong>.</p>
      <p>Cliquez sur le lien ci-dessous pour créer votre compte et accepter l'invitation :</p>
      <p><a href="${invitationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Accepter l'invitation</a></p>
      <p>Ce lien est valide pendant 7 jours.</p>
      <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
    `;

    // Appeler l'Edge Function send-email
    try {
      const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
        body: {
          to: email,
          subject: emailSubject,
          html: emailBody,
          email_type: 'invitation',
        },
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Ne pas échouer si l'email ne peut pas être envoyé, l'invitation est créée
      }
    } catch (emailErr) {
      console.error('Error invoking send-email function:', emailErr);
      // Continuer même si l'email ne peut pas être envoyé
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expires_at: invitation.expires_at,
        },
        invitation_url: invitationUrl, // Pour les tests
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

