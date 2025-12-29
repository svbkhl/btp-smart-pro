/**
 * Edge Function publique pour créer une session de paiement
 * Accessible sans authentification, utilise un token pour valider l'accès
 * Routes: /payment/quote/:id et /payment/invoice/:id
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
    // Créer un client Supabase avec service_role pour accès complet
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

    // Parser le body
    const body = await req.json();
    const {
      invoice_id,
      quote_id,
      token,
      payment_type = 'invoice', // 'deposit' | 'invoice' | 'final'
    } = body;

    if (!invoice_id && !quote_id) {
      return new Response(
        JSON.stringify({ error: 'invoice_id or quote_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Vérifier le token si fourni (optionnel mais recommandé)
    if (token) {
      const { data: paymentData } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('id', token)
        .single();

      if (paymentData) {
        // Vérifier que le paiement correspond au document
        if (quote_id && paymentData.quote_id !== quote_id) {
          return new Response(
            JSON.stringify({ error: 'Invalid token for this quote' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403,
            }
          );
        }
        if (invoice_id && paymentData.invoice_id !== invoice_id) {
          return new Response(
            JSON.stringify({ error: 'Invalid token for this invoice' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403,
            }
          );
        }

        // Si déjà payé, retourner une erreur
        if (paymentData.paid || paymentData.status === 'succeeded') {
          return new Response(
            JSON.stringify({ error: 'Payment already completed' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      }
    }

    // Récupérer le document (devis ou facture)
    let document: any = null;
    let customerEmail = '';
    let customerName = '';
    let amount = 0;
    let userId: string | null = null;

    if (quote_id) {
      const { data: quote, error: quoteError } = await supabaseClient
        .from('ai_quotes')
        .select('*, user_id')
        .eq('id', quote_id)
        .single();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: 'Quote not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      document = quote;
      customerEmail = quote.client_email || '';
      customerName = quote.client_name || '';
      amount = quote.estimated_cost || 0;
      userId = quote.user_id;
    } else if (invoice_id) {
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .select('*, user_id')
        .eq('id', invoice_id)
        .single();

      if (invoiceError || !invoice) {
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      document = invoice;
      customerEmail = invoice.client_email || '';
      customerName = invoice.client_name || '';
      amount = invoice.amount_ttc || 0;
      userId = invoice.user_id;
    }

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Customer email is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Récupérer les paramètres de paiement de l'utilisateur
    let paymentProvider = 'stripe'; // Par défaut
    let stripeSecretKey: string | null = null;

    if (userId) {
      const { data: userSettings } = await supabaseClient
        .from('user_settings')
        .select('payment_provider, stripe_secret_key')
        .eq('user_id', userId)
        .single();

      if (userSettings) {
        paymentProvider = userSettings.payment_provider || 'stripe';
        stripeSecretKey = userSettings.stripe_secret_key;
      }
    }

    // Pour l'instant, on supporte uniquement Stripe
    if (paymentProvider !== 'stripe') {
      return new Response(
        JSON.stringify({ error: 'Only Stripe is supported for public payments' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Utiliser la clé Stripe depuis les variables d'environnement ou user_settings
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || stripeSecretKey;
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Construire les URLs de retour
    const baseUrl = Deno.env.get('PUBLIC_URL') || 
                   Deno.env.get('PRODUCTION_URL') || 
                   Deno.env.get('VITE_APP_URL') ||
                   'http://localhost:3000';
    
    const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/payment/error`;

    // Créer la session Stripe Checkout
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'payment',
        payment_method_types: 'card',
        line_items: JSON.stringify([{
          price_data: {
            currency: 'eur',
            product_data: {
              name: quote_id ? `Devis ${document.quote_number || quote_id}` : `Facture ${document.invoice_number || invoice_id}`,
              description: `Paiement pour ${quote_id ? 'devis' : 'facture'} ${document.quote_number || document.invoice_number || ''}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe utilise les centimes
          },
          quantity: '1',
        }]),
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: JSON.stringify({
          invoice_id: invoice_id || '',
          quote_id: quote_id || '',
          payment_type,
          user_id: userId || '',
          payment_token: token || '',
        }),
      }),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text();
      console.error('Stripe error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create Stripe session' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const stripeSession = await stripeResponse.json();

    // Créer ou mettre à jour l'entrée dans la table payments
    const paymentData = {
      id: token || crypto.randomUUID(),
      user_id: userId,
      invoice_id: invoice_id || null,
      quote_id: quote_id || null,
      client_email: customerEmail,
      client_name: customerName,
      amount: amount,
      currency: 'EUR',
      status: 'pending',
      payment_type: paymentProvider,
      stripe_session_id: stripeSession.id,
      stripe_payment_intent_id: stripeSession.payment_intent || null,
      paid: false,
    };

    // Utiliser upsert pour créer ou mettre à jour
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .upsert(paymentData, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error saving payment:', paymentError);
      // Ne pas échouer, le paiement peut quand même être créé
    }

    return new Response(
      JSON.stringify({
        checkout_url: stripeSession.url,
        session_id: stripeSession.id,
        payment_id: payment?.id || paymentData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating public payment session:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});






