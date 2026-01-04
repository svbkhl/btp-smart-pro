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

    // Load email template
    const templatePath = new URL('../../../templates/emails/payment-link-email.html', import.meta.url);
    let htmlTemplate = await Deno.readTextFile(templatePath);

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
