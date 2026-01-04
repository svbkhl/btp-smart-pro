/**
 * Edge Function pour envoyer un email de confirmation après signature
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
    const { quote_id } = body;

    console.log('📧 [send-signature-confirmation] Envoi email pour quote:', quote_id);

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Récupérer les données du devis signé
    let { data: quote, error: quoteError } = await supabaseClient
      .from('ai_quotes')
      .select('*')
      .eq('id', quote_id)
      .maybeSingle();

    if (!quote) {
      const quotesResult = await supabaseClient
        .from('quotes')
        .select('*')
        .eq('id', quote_id)
        .maybeSingle();
      
      quote = quotesResult.data;
    }

    if (!quote || !quote.signed) {
      return new Response(
        JSON.stringify({ error: 'Quote not found or not signed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const clientEmail = quote.email || quote.client_email;

    if (!clientEmail) {
      console.warn('⚠️ Pas d\'email client trouvé');
      return new Response(
        JSON.stringify({ error: 'Client email not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Envoyer l'email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.warn('⚠️ RESEND_API_KEY non configurée');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email service not configured',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') || 'noreply@btpsmartpro.com',
        to: [clientEmail],
        subject: `✅ Confirmation de signature - Devis ${quote.quote_number || ''}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .signature-info { background: white; border: 2px solid #10B981; border-radius: 10px; padding: 20px; margin: 20px 0; }
                .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB; }
                .info-row:last-child { border-bottom: none; }
                .label { color: #6B7280; font-weight: 500; }
                .value { color: #111827; font-weight: 600; }
                .next-steps { background: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .footer { text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB; }
                .checkmark { font-size: 48px; text-align: center; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="checkmark">✅</div>
                  <h1 style="margin: 0; font-size: 24px;">Signature confirmée</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre devis a été signé avec succès</p>
                </div>
                <div class="content">
                  <p>Bonjour <strong>${quote.client_name || 'Client'}</strong>,</p>
                  
                  <p>Nous avons bien reçu la signature de votre devis. Voici un récapitulatif :</p>
                  
                  <div class="signature-info">
                    <h3 style="margin-top: 0; color: #10B981;">📄 Informations du devis</h3>
                    <div class="info-row">
                      <span class="label">Numéro de devis</span>
                      <span class="value">${quote.quote_number || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Montant TTC</span>
                      <span class="value">${quote.estimated_cost ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.estimated_cost) : 'N/A'}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Signé le</span>
                      <span class="value">${new Date(quote.signed_at).toLocaleString('fr-FR', { 
                        dateStyle: 'full', 
                        timeStyle: 'short',
                        timeZone: 'Europe/Paris'
                      })}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Signé par</span>
                      <span class="value">${quote.signed_by || 'Non spécifié'}</span>
                    </div>
                  </div>
                  
                  <div class="next-steps">
                    <h4 style="margin-top: 0; color: #10B981;">🚀 Prochaines étapes</h4>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>Notre équipe va traiter votre dossier sous 24-48h</li>
                      <li>Vous recevrez prochainement un lien de paiement sécurisé</li>
                      <li>Un certificat de signature électronique sera généré</li>
                      <li>Nous vous contacterons pour planifier les travaux</li>
                    </ul>
                  </div>
                  
                  <p style="margin-top: 30px;">Pour toute question, n'hésitez pas à nous contacter.</p>
                  
                  <p style="margin-top: 20px;">Cordialement,<br><strong>L'équipe BTP Smart Pro</strong></p>
                </div>
                <div class="footer">
                  <p><strong>BTP Smart Pro</strong> - Gestion intelligente de vos projets</p>
                  <p style="font-size: 12px; color: #9CA3AF;">Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
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

    console.log('✅ Email de confirmation envoyé à:', clientEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Confirmation email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error in send-signature-confirmation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});


