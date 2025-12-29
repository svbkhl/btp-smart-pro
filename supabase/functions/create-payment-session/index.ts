/**
 * Create Payment Session Edge Function
 * 
 * Crée une session de paiement avec le provider configuré pour l'entreprise
 * Supporte: Stripe, SumUp, PayPlug, Stancer, GoCardless
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import du PaymentService (à adapter selon la structure du projet)
// En production, il faudra bundler le code TypeScript ou utiliser un import direct
import { paymentService } from '../../src/services/PaymentService.ts';

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

    // Parser le body
    const body = await req.json();
    const {
      invoice_id,
      quote_id,
      payment_type, // 'deposit' | 'invoice' | 'final'
      amount,
      deposit_percentage,
      deposit_fixed_amount,
      description,
    } = body;

    // Calculer le montant
    let finalAmount = amount;
    if (!finalAmount && quote_id) {
      // Récupérer le montant du devis
      const { data: quote } = await supabaseClient
        .from('ai_quotes')
        .select('estimated_cost')
        .eq('id', quote_id)
        .single();

      if (quote) {
        if (deposit_fixed_amount) {
          finalAmount = deposit_fixed_amount;
        } else if (deposit_percentage) {
          finalAmount = (quote.estimated_cost * deposit_percentage) / 100;
        } else {
          finalAmount = quote.estimated_cost * 0.3; // 30% par défaut
        }
      }
    } else if (!finalAmount && invoice_id) {
      // Récupérer le montant de la facture
      const { data: invoice } = await supabaseClient
        .from('invoices')
        .select('amount_ttc')
        .eq('id', invoice_id)
        .single();

      if (invoice) {
        finalAmount = invoice.amount_ttc;
      }
    }

    if (!finalAmount) {
      throw new Error('Amount is required');
    }

    // Récupérer les informations du client
    let customerEmail = '';
    if (invoice_id) {
      const { data: invoice } = await supabaseClient
        .from('invoices')
        .select('client_email, client_name')
        .eq('id', invoice_id)
        .single();
      
      customerEmail = invoice?.client_email || '';
    } else if (quote_id) {
      const { data: quote } = await supabaseClient
        .from('ai_quotes')
        .select('client_email, client_name')
        .eq('id', quote_id)
        .single();
      
      customerEmail = quote?.client_email || '';
    }

    if (!customerEmail) {
      throw new Error('Customer email is required');
    }

    // Construire les URLs de retour
    const baseUrl = Deno.env.get('PUBLIC_URL') || 
                   Deno.env.get('PRODUCTION_URL') || 
                   'http://localhost:3000';
    
    const successUrl = `${baseUrl}/payment/success?session_id={SESSION_ID}`;
    const cancelUrl = `${baseUrl}/payment/error`;

    // Créer la session de paiement avec le PaymentService
    const sessionResult = await paymentService.createPaymentSession(
      {
        amount: finalAmount,
        currency: 'EUR',
        customerEmail,
        customerName: body.customer_name,
        description: description || `Paiement ${payment_type}`,
        metadata: {
          invoice_id: invoice_id || '',
          quote_id: quote_id || '',
          payment_type,
          user_id: user.id,
        },
        successUrl,
        cancelUrl,
        invoiceId: invoice_id,
        quoteId: quote_id,
      },
      user.id
    );

    // Sauvegarder le paiement dans la base de données
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        invoice_id: invoice_id || null,
        quote_id: quote_id || null,
        amount: finalAmount,
        status: 'pending',
        provider_type: 'stripe', // TODO: Récupérer depuis la config
        provider_session_id: sessionResult.sessionId,
        provider_payment_id: sessionResult.providerPaymentId,
        due_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error saving payment:', paymentError);
      // Ne pas échouer si l'insertion échoue, le paiement peut quand même être créé
    }

    return new Response(
      JSON.stringify({
        checkout_url: sessionResult.checkoutUrl,
        session_id: sessionResult.sessionId,
        payment_id: payment?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating payment session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});














