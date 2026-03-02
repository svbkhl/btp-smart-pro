import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const APP_URL = Deno.env.get('APP_URL') || 'https://btpsmartpro.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'contact@btpsmartpro.com';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const normalizedEmail = email.toLowerCase().trim();
    const redirectTo = `${APP_URL}/closer`;

    let actionLink: string;
    let isExisting = false;

    // 1. Essayer d'abord "invite" (crée le compte si inexistant)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (!inviteError && inviteData?.properties?.action_link) {
      actionLink = inviteData.properties.action_link;
    } else {
      // 2. L'utilisateur existe déjà → magic link
      isExisting = true;
      const { data: mlData, error: mlError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: { redirectTo },
      });

      if (mlError || !mlData?.properties?.action_link) {
        throw new Error(mlError?.message || inviteError?.message || 'Impossible de générer le lien');
      }
      actionLink = mlData.properties.action_link;
    }

    // Envoyer l'email via Resend avec un template closer personnalisé
    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accès Closer — BTP Smart Pro</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5; margin:0; padding:20px;">
  <table role="presentation" style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#f97316,#ea580c); padding:40px 30px; text-align:center;">
        <div style="background:rgba(255,255,255,0.15); display:inline-block; padding:12px 20px; border-radius:8px; margin-bottom:16px;">
          <span style="color:#fff; font-size:24px; font-weight:800;">B</span>
          <span style="color:#fff; font-size:16px; font-weight:600; margin-left:8px;">BTP Smart Pro</span>
        </div>
        <h1 style="color:#fff; margin:0; font-size:24px; font-weight:700;">Votre accès Closer est prêt !</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <p style="color:#333; font-size:16px; margin:0 0 20px;">Bonjour,</p>
        <p style="color:#333; font-size:16px; margin:0 0 20px;">
          Vous avez été ajouté en tant que <strong>Closer BTP Smart Pro</strong>. 
          Votre espace vous permet de :
        </p>
        <ul style="color:#555; font-size:15px; margin:0 0 24px; padding-left:20px; line-height:2;">
          <li>Faire des <strong>démos complètes</strong> aux prospects (vue patron + vue employé)</li>
          <li><strong>Créer des entreprises</strong> pour vos clients</li>
          <li><strong>Inviter les dirigeants</strong> à rejoindre leur espace</li>
        </ul>
        <table role="presentation" style="width:100%; margin:30px 0;">
          <tr>
            <td align="center">
              <a href="${actionLink}" style="display:inline-block; padding:16px 40px; background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; text-decoration:none; border-radius:8px; font-weight:700; font-size:16px; box-shadow:0 4px 12px rgba(249,115,22,0.4);">
                ${isExisting ? 'Accéder à mon espace Closer' : 'Créer mon compte et accéder à mon espace'}
              </a>
            </td>
          </tr>
        </table>
        <p style="color:#999; font-size:13px; margin:20px 0 0; text-align:center;">
          Ce lien est valide 24h. Si vous n'avez pas demandé cet accès, ignorez cet email.
        </p>
        <p style="color:#ccc; font-size:11px; margin:12px 0 0; word-break:break-all; text-align:center;">
          ${actionLink}
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb; padding:24px; text-align:center; border-top:1px solid #e5e7eb;">
        <p style="color:#666; font-size:13px; margin:0;"><strong>BTP Smart Pro</strong> — Votre partenaire pour la gestion BTP</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `BTP Smart Pro <${FROM_EMAIL}>`,
        to: [normalizedEmail],
        subject: isExisting
          ? 'Votre accès Closer BTP Smart Pro'
          : 'Bienvenue — Votre accès Closer BTP Smart Pro',
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erreur Resend');
    }

    return new Response(
      JSON.stringify({ success: true, message: `Invitation envoyée à ${normalizedEmail}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[invite-closer] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
