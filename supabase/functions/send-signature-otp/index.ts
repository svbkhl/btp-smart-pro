/**
 * Edge Function pour envoyer un code OTP de signature par email
 * Accessible sans authentification pour permettre aux clients de recevoir le code
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Génère un code OTP à 6 chiffres
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();
    const { email, quote_id, session_token, client_name } = body;

    // Capturer l'IP
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       req.headers.get('x-real-ip') || 
                       'unknown';

    console.log('📧 [send-otp] Envoi OTP pour:', { email, quote_id, session_token });

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Générer le code OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Enregistrer l'OTP en base
    const { data: otpRecord, error: otpError } = await supabaseClient
      .from('signature_otp')
      .insert({
        quote_id: quote_id || null,
        session_token: session_token || null,
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        ip_address: ip_address,
      })
      .select()
      .single();

    if (otpError) {
      console.error('❌ Erreur création OTP:', otpError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP', details: otpError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Envoyer l'email avec le code OTP
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.warn('⚠️ RESEND_API_KEY non configurée, OTP généré mais email non envoyé');
      // En dev, retourner le code pour les tests
      return new Response(
        JSON.stringify({
          success: true,
          otp_id: otpRecord.id,
          message: 'OTP generated (email not sent - dev mode)',
          dev_otp_code: otpCode, // ⚠️ À retirer en production !
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Envoi via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') || 'noreply@btpsmartpro.com',
        to: [email],
        subject: `Code de vérification: ${otpCode}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-code { background: white; border: 2px solid #3B82F6; border-radius: 10px; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3B82F6; margin: 20px 0; }
                .info { background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .footer { text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Code de vérification</h1>
                  <p>Signature électronique de devis</p>
                </div>
                <div class="content">
                  <p>Bonjour${client_name ? ` ${client_name}` : ''},</p>
                  <p>Voici votre code de vérification pour signer électroniquement votre devis :</p>
                  
                  <div class="otp-code">${otpCode}</div>
                  
                  <div class="info">
                    <p><strong>ℹ️ Important :</strong></p>
                    <ul>
                      <li>Ce code expire dans <strong>10 minutes</strong></li>
                      <li>Ne partagez ce code avec personne</li>
                      <li>Saisissez-le sur la page de signature pour finaliser</li>
                    </ul>
                  </div>
                  
                  <p>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} BTP Smart Pro - Signature électronique sécurisée</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('❌ Erreur envoi email:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Enregistrer l'événement d'audit
    try {
      await supabaseClient
        .from('signature_events')
        .insert({
          quote_id: quote_id || null,
          session_token: session_token || null,
          event_type: 'otp_sent',
          event_data: { email: email },
          ip_address: ip_address,
        });
    } catch (auditError) {
      console.error('⚠️ Erreur audit (non bloquant):', auditError);
    }

    console.log('✅ OTP envoyé avec succès à:', email);

    return new Response(
      JSON.stringify({
        success: true,
        otp_id: otpRecord.id,
        message: 'Verification code sent successfully',
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error in send-signature-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
