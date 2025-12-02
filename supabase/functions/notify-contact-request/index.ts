/**
 * Notify Contact Request Edge Function
 * 
 * Envoie une notification à l'admin lorsqu'un visiteur
 * demande un essai gratuit ou contacte via le formulaire
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      request_id,
      nom,
      prenom,
      email,
      telephone,
      entreprise,
      message,
      trial_requested,
      request_type,
    } = body;

    if (!nom || !prenom || !email) {
      throw new Error('Missing required fields');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer l'email de l'admin (premier utilisateur avec rôle administrateur)
    const { data: adminRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'administrateur')
      .limit(1);

    let adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@btp-smartpro.fr';

    if (adminRoles && adminRoles.length > 0) {
      // Récupérer l'email depuis auth.users via l'API admin
      const { data: adminUser } = await supabaseClient.auth.admin.getUserById(adminRoles[0].user_id);
      if (adminUser?.user?.email) {
        adminEmail = adminUser.user.email;
      }
    }

    // Construire le sujet et le contenu de l'email
    const subject = trial_requested
      ? `🎁 Nouvelle demande d'essai gratuit - ${prenom} ${nom}`
      : `📧 Nouvelle demande de contact - ${prenom} ${nom}`;

    const emailContent = `
      <h2>${trial_requested ? '🎁 Demande d\'essai gratuit' : '📧 Nouvelle demande de contact'}</h2>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Informations du contact</h3>
        <p><strong>Nom :</strong> ${prenom} ${nom}</p>
        <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
        ${telephone ? `<p><strong>Téléphone :</strong> <a href="tel:${telephone}">${telephone}</a></p>` : ''}
        ${entreprise ? `<p><strong>Entreprise :</strong> ${entreprise}</p>` : ''}
        ${message ? `<p><strong>Message :</strong><br>${message.replace(/\n/g, '<br>')}</p>` : ''}
        <p><strong>Type de demande :</strong> ${request_type === 'essai_gratuit' ? 'Essai gratuit' : request_type === 'contact' ? 'Contact' : 'Information'}</p>
        ${trial_requested ? '<p style="color: #059669; font-weight: bold;">✅ Essai gratuit de 2 semaines demandé</p>' : ''}
      </div>

      ${trial_requested ? `
      <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0;"><strong>Action requise :</strong> Créez une entreprise pour ce client et envoyez-lui une invitation avec le rôle "owner".</p>
      </div>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        ID de la demande : ${request_id}
      </p>
    `;

    // Envoyer l'email à l'admin
    try {
      const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
        body: {
          to: adminEmail,
          subject,
          html: emailContent,
          email_type: 'contact_request',
        },
      });

      if (emailError) {
        console.error('Error sending notification email:', emailError);
        // Ne pas échouer si l'email ne peut pas être envoyé
      }
    } catch (emailErr) {
      console.error('Error invoking send-email function:', emailErr);
    }

    // Envoyer un email de confirmation au visiteur
    try {
      const confirmationSubject = trial_requested
        ? 'Votre demande d\'essai gratuit a été reçue'
        : 'Votre message a été reçu';

      const confirmationContent = `
        <h2>Bonjour ${prenom},</h2>
        <p>Nous avons bien reçu votre ${trial_requested ? 'demande d\'essai gratuit' : 'message'}.</p>
        ${trial_requested ? '<p>Nous allons examiner votre demande et vous contacterons rapidement pour vous envoyer votre invitation.</p>' : '<p>Nous vous répondrons dans les plus brefs délais.</p>'}
        <p>Cordialement,<br>L'équipe BTP Smart Pro</p>
      `;

      await supabaseClient.functions.invoke('send-email', {
        body: {
          to: email,
          subject: confirmationSubject,
          html: confirmationContent,
          email_type: 'contact_confirmation',
        },
      });
    } catch (confirmationErr) {
      console.error('Error sending confirmation email:', confirmationErr);
      // Ne pas échouer si l'email de confirmation ne peut pas être envoyé
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error notifying contact request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

