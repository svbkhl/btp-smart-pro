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
    const { quote_id, client_email } = body;

    console.log('📧 [send-signature-confirmation] Envoi email pour quote:', quote_id, 'client_email fourni:', client_email);

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
      .select('*, project_id')
      .eq('id', quote_id)
      .maybeSingle();

    if (!quote) {
      const quotesResult = await supabaseClient
        .from('quotes')
        .select('*, project_id')
        .eq('id', quote_id)
        .maybeSingle();
      
      quote = quotesResult.data;
    }

    if (!quote || !quote.signed) {
      console.warn('⚠️ [send-signature-confirmation] Devis non trouvé ou non signé:', quote_id);
      return new Response(
        JSON.stringify({ error: 'Quote not found or not signed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Récupérer l'email du signataire (priorité: paramètre > devis > session)
    let clientEmail = client_email || quote.email || quote.client_email;
    let clientName = quote.client_name || quote.signed_by || 'Client';
    
    console.log('🔍 [send-signature-confirmation] Recherche email client:', {
      client_email_param: client_email,
      quote_email: quote.email,
      quote_client_email: quote.client_email,
      current_clientEmail: clientEmail,
    });
    
    // Si pas d'email fourni, chercher dans signature_sessions
    if (!clientEmail) {
      console.log('🔍 [send-signature-confirmation] Pas d\'email dans le devis, recherche dans signature_sessions...');
      const { data: signatureSession } = await supabaseClient
        .from('signature_sessions')
        .select('signer_email, signer_name')
        .eq('quote_id', quote_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (signatureSession?.signer_email) {
        clientEmail = signatureSession.signer_email;
        console.log('✅ [send-signature-confirmation] Email depuis session:', clientEmail);
      }
      
      if (signatureSession?.signer_name && !clientName) {
        clientName = signatureSession.signer_name;
      }
      
      // Si toujours pas d'email, chercher dans les événements de signature
      if (!clientEmail) {
        console.log('🔍 [send-signature-confirmation] Pas d\'email dans session, recherche dans signature_events...');
        const { data: signatureEvent } = await supabaseClient
          .from('signature_events')
          .select('event_data')
          .eq('quote_id', quote_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (signatureEvent?.event_data?.signer_email) {
          clientEmail = signatureEvent.event_data.signer_email;
          console.log('✅ [send-signature-confirmation] Email depuis signature_events:', clientEmail);
        }
      }
      
      // Si toujours pas d'email et que le devis est lié à un projet, chercher dans le client du projet
      if (!clientEmail && quote.project_id) {
        console.log('🔍 [send-signature-confirmation] Pas d\'email trouvé, recherche dans projet:', quote.project_id);
        try {
          const { data: project } = await supabaseClient
            .from('projects')
            .select('client_id, clients(email, name)')
            .eq('id', quote.project_id)
            .single();
          
          if (project?.clients) {
            const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
            if (client?.email) {
              clientEmail = client.email;
              console.log('✅ [send-signature-confirmation] Email depuis projet:', clientEmail);
            }
            if (client?.name && !clientName) {
              clientName = client.name;
            }
          }
        } catch (error) {
          console.warn('⚠️ [send-signature-confirmation] Erreur récupération email depuis projet:', error);
        }
      }
    } else {
      console.log('✅ [send-signature-confirmation] Email trouvé:', clientEmail);
    }

    if (!clientEmail) {
      console.error('❌ [send-signature-confirmation] Pas d\'email client trouvé pour quote:', quote_id);
      console.error('❌ [send-signature-confirmation] Données disponibles:', {
        quote_id,
        quote_email: quote.email,
        quote_client_email: quote.client_email,
        client_email_param: client_email,
        quote_data: {
          id: quote.id,
          quote_number: quote.quote_number,
          signed: quote.signed,
          signed_at: quote.signed_at,
        }
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Client email not found',
          quote_id: quote_id,
          quote_data: {
            has_email: !!quote.email,
            has_client_email: !!quote.client_email,
            has_client_email_param: !!client_email,
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('📧 [send-signature-confirmation] Envoi email à:', clientEmail, 'pour devis:', quote.quote_number);

    // Récupérer les informations de l'entreprise pour la signature de l'email
    let companyName = 'BTP Smart Pro';
    let companyEmail = '';
    
    if (quote.user_id) {
      const { data: userSettings } = await supabaseClient
        .from('user_settings')
        .select('company_name, email, signature_name')
        .eq('user_id', quote.user_id)
        .single();
      
      if (userSettings) {
        companyName = userSettings.company_name || companyName;
        companyEmail = userSettings.email || '';
      }
    }

    // Envoyer l'email via l'Edge Function send-email (système centralisé)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('❌ [send-signature-confirmation] Configuration Supabase manquante');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email service not configured',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const emailHtml = `
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
                  
                  <p style="margin-top: 20px;">Cordialement,<br><strong>${companyName}</strong></p>
                  ${companyEmail ? `<p style="font-size: 12px; color: #6B7280;">Email: ${companyEmail}</p>` : ''}
                </div>
                <div class="footer">
                  <p><strong>${companyName}</strong> - Gestion intelligente de vos projets</p>
                  <p style="font-size: 12px; color: #9CA3AF;">Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
                </div>
              </div>
            </body>
          </html>
        `;

    const emailText = `
✅ Confirmation de signature - Devis ${quote.quote_number || ''}

Bonjour ${clientName},

Nous avons bien reçu la signature de votre devis. Voici un récapitulatif :

📄 Informations du devis
- Numéro de devis: ${quote.quote_number || 'N/A'}
- Montant TTC: ${quote.estimated_cost ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.estimated_cost) : 'N/A'}
- Signé le: ${new Date(quote.signed_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' })}
- Signé par: ${quote.signed_by || 'Non spécifié'}

🚀 Prochaines étapes
- Notre équipe va traiter votre dossier sous 24-48h
- Vous recevrez prochainement un lien de paiement sécurisé
- Un certificat de signature électronique sera généré
- Nous vous contacterons pour planifier les travaux

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
${companyName}
${companyEmail ? `Email: ${companyEmail}` : ''}
    `;

    // TODO: Générer le PDF du devis signé
    // Pour l'instant, on envoie l'email sans pièce jointe
    // Une Edge Function dédiée pour générer le PDF devrait être créée
    // et appelée ici pour ajouter le PDF en pièce jointe
    
    // Récupérer les informations complètes pour générer le PDF
    let companySettings = null;
    if (quote.user_id) {
      const { data: settings } = await supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', quote.user_id)
        .single();
      
      if (settings) {
        companySettings = settings;
      }
    }

    // Récupérer les sections et lignes si mode détaillé
    let pdfSections: any[] | undefined = undefined;
    let pdfLines: any[] | undefined = undefined;
    
    const quoteMode = quote.mode || (quote.details?.format === "simplified" ? "simple" : "detailed");
    if (quoteMode === "detailed" && quote.id) {
      const { data: sectionsData } = await supabaseClient
        .from('quote_sections')
        .select('*')
        .eq('quote_id', quote.id)
        .order('position', { ascending: true });
      
      if (sectionsData) {
        pdfSections = sectionsData;
      }

      const { data: linesData } = await supabaseClient
        .from('quote_lines')
        .select('*')
        .eq('quote_id', quote.id)
        .order('section_id', { ascending: true, nullsFirst: false })
        .order('position', { ascending: true });
      
      if (linesData) {
        pdfLines = linesData;
      }
    }

    // Préparer les attachments (pour l'instant vide, à compléter avec génération PDF)
    const attachments: Array<{
      filename: string;
      content: string; // Base64
      type: string;
    }> = [];

    // TODO: Appeler une Edge Function pour générer le PDF en base64
    // const pdfResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-quote-pdf-base64`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    //     'apikey': SERVICE_ROLE_KEY,
    //   },
    //   body: JSON.stringify({
    //     quote_id: quote_id,
    //     include_signature: true,
    //   }),
    // });
    // 
    // if (pdfResponse.ok) {
    //   const pdfData = await pdfResponse.json();
    //   attachments.push({
    //     filename: `Devis-${quote.quote_number || quote_id}.pdf`,
    //     content: pdfData.base64,
    //     type: 'application/pdf',
    //   });
    // }

    // Appeler l'Edge Function send-email avec les attachments
    console.log('📧 [send-signature-confirmation] Appel send-email avec:', {
      to: clientEmail,
      subject: `✅ Confirmation de signature - Devis ${quote.quote_number || ''}`,
      has_html: !!emailHtml,
      has_text: !!emailText,
      attachments_count: attachments.length,
    });
    
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        to: clientEmail,
        subject: `✅ Confirmation de signature - Devis ${quote.quote_number || ''}`,
        html: emailHtml,
        text: emailText,
        type: 'confirmation',
        quote_id: quote_id,
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    });

    const emailResult = await emailResponse.json().catch(async (err) => {
      const text = await emailResponse.text().catch(() => 'Unable to read response');
      console.error('❌ [send-signature-confirmation] Erreur parsing réponse email:', err, 'response:', text);
      return { error: 'Failed to parse response', details: text };
    });

    if (!emailResponse.ok) {
      console.error('❌ [send-signature-confirmation] Erreur envoi email:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        result: emailResult,
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to send email', 
          details: emailResult,
          status: emailResponse.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('✅ [send-signature-confirmation] Email de confirmation envoyé à:', clientEmail, 'email_id:', emailResult.email_id || emailResult.id);

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



