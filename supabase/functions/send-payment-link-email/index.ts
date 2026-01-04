/**
 * Edge Function: send-payment-link-email
 * 
 * Envoie un email au client avec le lien de paiement Stripe
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@btpsmartpro.com';

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      quote_id, 
      payment_url,
      payment_type,
      amount,
      client_email,
      client_name
    } = body;

    console.log('📧 [send-payment-link-email] Envoi email:', { quote_id, client_email, payment_type, amount });

    if (!quote_id || !payment_url || !client_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: quote_id, payment_url, client_email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get quote details
    const { data: quote, error: quoteError } = await supabaseClient
      .from('ai_quotes')
      .select('*')
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get company info from user_settings
    const { data: userSettings } = await supabaseClient
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const companyName = userSettings?.company_name || 'BTP Smart Pro';
    const companyAddress = userSettings?.address || '';
    const companyPhone = userSettings?.phone || '';
    const companyEmail = userSettings?.email || FROM_EMAIL;

    // Determine payment type label
    let paymentTypeLabel = 'Paiement total';
    if (payment_type === 'deposit') {
      paymentTypeLabel = 'Acompte';
    } else if (payment_type === 'installments') {
      paymentTypeLabel = 'Paiement en plusieurs fois';
    }

    // Format amount
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

    // HTML email template (inline pour éviter problèmes de path)
    let htmlTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">💳 Votre lien de paiement</h1>
                            <p style="color: #e0e7ff; margin: 10px 0 0; font-size: 16px;">{{company_name}}</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Bonjour <strong>{{client_name}}</strong>,</p>
                            <p style="color: #374151; font-size: 16px; margin: 0 0 30px;">Merci d'avoir signé le devis <strong>{{quote_number}}</strong>. Vous pouvez maintenant procéder au paiement.</p>

                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <tr><td>
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                        <tr>
                                            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Devis</td>
                                            <td align="right" style="color: #111827; font-size: 14px; font-weight: 600; padding: 8px 0;">{{quote_number}}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-top: 1px solid #e5e7eb;">Type</td>
                                            <td align="right" style="color: #111827; font-size: 14px; font-weight: 600; padding: 8px 0; border-top: 1px solid #e5e7eb;">{{payment_type_label}}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #6b7280; font-size: 16px; font-weight: 600; padding: 12px 0; border-top: 2px solid #e5e7eb;">Montant</td>
                                            <td align="right" style="color: #3b82f6; font-size: 24px; font-weight: 700; padding: 12px 0; border-top: 2px solid #e5e7eb;">{{amount}}</td>
                                        </tr>
                                    </table>
                                </td></tr>
                            </table>

                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
                                <tr><td align="center">
                                    <a href="{{payment_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 700;">💳 Payer maintenant</a>
                                </td></tr>
                            </table>

                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin-bottom: 30px;">
                                <tr><td style="color: #065f46; font-size: 14px;">
                                    <strong>✓ Paiement 100% sécurisé</strong><br>Vos informations sont protégées par Stripe.
                                </td></tr>
                            </table>

                            <p style="color: #6b7280; font-size: 14px; margin: 0;">Lien de secours :</p>
                            <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 10px 0 0; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">{{payment_url}}</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px;"><strong>{{company_name}}</strong><br>{{company_phone}} • {{company_email}}</p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© {{current_year}} {{company_name}}</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    // Replace placeholders
    htmlTemplate = htmlTemplate
      .replace(/{{company_name}}/g, companyName)
      .replace(/{{company_address}}/g, companyAddress)
      .replace(/{{company_phone}}/g, companyPhone)
      .replace(/{{company_email}}/g, companyEmail)
      .replace(/{{client_name}}/g, client_name || 'Client')
      .replace(/{{quote_number}}/g, quote.quote_number || quote_id.substring(0, 8))
      .replace(/{{payment_type_label}}/g, paymentTypeLabel)
      .replace(/{{amount}}/g, formattedAmount)
      .replace(/{{payment_url}}/g, payment_url)
      .replace(/{{current_year}}/g, new Date().getFullYear().toString());

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <${FROM_EMAIL}>`,
        to: [client_email],
        subject: `💳 Votre lien de paiement - ${quote.quote_number || 'Devis'}`,
        html: htmlTemplate,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('❌ Resend API error:', errorData);
      throw new Error('Failed to send email');
    }

    const resendData = await resendResponse.json();
    console.log('✅ Email envoyé:', resendData);

    // Enregistrer l'email dans email_messages
    try {
      const { error: insertError } = await supabaseClient
        .from('email_messages')
        .insert({
          user_id: user.id,
          to_email: client_email, // Utiliser to_email au lieu de recipient_email
          subject: `💳 Votre lien de paiement - ${quote.quote_number || 'Devis'}`,
          body_html: htmlTemplate,
          body_text: `Bonjour ${client_name}, voici votre lien de paiement: ${payment_url}`,
          email_type: 'payment_link',
          status: 'sent',
          external_id: resendData.id,
          sent_at: new Date().toISOString(),
          quote_id: quote_id,
          document_id: quote_id,
          document_type: 'quote',
        });

      if (insertError) {
        console.error('⚠️ Erreur enregistrement email_messages:', insertError);
        // Ne pas faire échouer la requête si l'enregistrement échoue
      } else {
        console.log('✅ Email enregistré dans email_messages');
      }
    } catch (dbError: any) {
      console.error('⚠️ Erreur DB email_messages:', dbError);
      // Continue anyway
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: resendData.id,
        message: `Email envoyé à ${client_email}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error in send-payment-link-email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
