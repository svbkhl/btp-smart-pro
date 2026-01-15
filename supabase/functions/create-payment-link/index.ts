/**
 * Edge Function: create-payment-link
 * 
 * Crée un lien de paiement Stripe Checkout Session
 * 
 * Flow:
 * 1. Vérifie que le devis est signé
 * 2. Génère ou récupère la facture
 * 3. Crée une Stripe Checkout Session
 * 4. Enregistre le paiement en DB
 * 5. Retourne le lien de paiement
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { verifyCompanyMember } from "../_shared/auth.ts";

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
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
    const APP_URL = Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_URL') || 'https://www.btpsmartpro.com';

    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
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

    // Vérifier l'authentification et l'appartenance à une company
    const { verifyCompanyMember } = await import("../_shared/auth.ts");
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    const authResult = await verifyCompanyMember(
      req,
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    if (!authResult.success || !authResult.user || !authResult.companyId) {
      return new Response(
        JSON.stringify({ error: authResult.error || 'Unauthorized' }),
        {
          status: authResult.status || 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = { id: authResult.user.id, email: authResult.user.email };
    const companyId = authResult.companyId;

    // Parse request body
    const body = await req.json();
    const { 
      quote_id, 
      invoice_id,
      payment_type = 'total', // 'total', 'deposit', 'partial'
      amount, // Montant custom (pour acompte)
      client_email,
      client_name
    } = body;

    console.log('📥 [create-payment-link] Requête:', { quote_id, invoice_id, payment_type, amount, user_id: user.id });

    // =====================================================
    // 1️⃣ VÉRIFIER LE DEVIS
    // =====================================================

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Récupérer le devis (vérifier qu'il appartient à la company de l'user)
    const { data: quote, error: quoteError } = await supabaseClient
      .from('ai_quotes')
      .select('*')
      .eq('id', quote_id)
      .eq('company_id', companyId) // Multi-tenant: vérifier company_id au lieu de user_id
      .maybeSingle();

    if (!quote) {
      console.error('❌ Devis non trouvé ou n\'appartient pas à votre entreprise');
      return new Response(
        JSON.stringify({ error: 'Quote not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (quoteError || !quote) {
      console.error('❌ Devis non trouvé:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Vérifier que le devis est signé
    if (!quote.signed || !quote.signed_at) {
      console.error('❌ Devis non signé');
      return new Response(
        JSON.stringify({ error: 'Quote must be signed before payment', quote_status: quote.status }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Devis trouvé et signé:', quote_id);

    // =====================================================
    // 2️⃣ GÉNÉRER OU RÉCUPÉRER LA FACTURE
    // =====================================================

    let invoice;
    let invoiceId = invoice_id;

    if (!invoiceId) {
      // Vérifier si une facture existe déjà pour ce devis
      const { data: existingInvoice } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('quote_id', quote_id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (existingInvoice) {
        invoice = existingInvoice;
        invoiceId = existingInvoice.id;
        console.log('✅ Facture existante trouvée:', invoiceId);
      } else {
        // Créer une nouvelle facture
        const invoiceAmount = quote.estimated_cost || 0;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

        const { data: newInvoice, error: invoiceError } = await supabaseClient
          .from('invoices')
          .insert({
            user_id: user.id,
            company_id: quote.company_id,
            client_id: quote.client_id,
            quote_id: quote_id,
            invoice_number: invoiceNumber,
            client_name: quote.client_name || client_name,
            client_email: quote.client_email || client_email,
            amount: invoiceAmount,
            total_ttc: invoiceAmount,
            amount_paid: 0,
            amount_remaining: invoiceAmount,
            status: 'draft',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
          })
          .select()
          .single();

        if (invoiceError || !newInvoice) {
          console.error('❌ Erreur création facture:', invoiceError);
          return new Response(
            JSON.stringify({ error: 'Failed to create invoice', details: invoiceError?.message }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        invoice = newInvoice;
        invoiceId = newInvoice.id;
        console.log('✅ Nouvelle facture créée:', invoiceId);
      }
    } else {
      // Récupérer la facture existante
      const { data: existingInvoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (invoiceError || !existingInvoice) {
        console.error('❌ Facture non trouvée:', invoiceError);
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      invoice = existingInvoice;
    }

    // Vérifier si la facture est déjà payée
    if (invoice.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Invoice already paid' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 3️⃣ CALCULER LE MONTANT À PAYER
    // =====================================================

    let paymentAmount = 0;
    const invoiceTotal = invoice.amount || invoice.total_ttc || 0;
    const alreadyPaid = invoice.amount_paid || 0;
    const remaining = invoiceTotal - alreadyPaid;

    if (payment_type === 'total') {
      paymentAmount = remaining;
    } else if (payment_type === 'deposit' || payment_type === 'partial') {
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Amount is required for deposit/partial payment' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      paymentAmount = Math.min(amount, remaining); // Ne pas dépasser le restant
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment_type. Use: total, deposit, or partial' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (paymentAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Payment amount must be greater than 0' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('💰 Montant à payer:', { paymentAmount, payment_type, invoiceTotal, alreadyPaid, remaining });

    // =====================================================
    // 4️⃣ CRÉER LA STRIPE CHECKOUT SESSION
    // =====================================================

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Récupérer le stripe_account_id de l'utilisateur (Stripe Connect)
    // Note: user_settings n'a pas company_id, on utilise user_id
    const { data: userSettings } = await supabaseClient
      .from('user_settings')
      .select('stripe_account_id, stripe_connected')
      .eq('user_id', user.id)
      .maybeSingle();

    const stripeAccountId = userSettings?.stripe_account_id;

    // Paramètres de base pour la session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Facture ${invoice.invoice_number}`,
              description: `Paiement ${payment_type === 'total' ? 'total' : 'acompte'} - Devis ${quote.quote_number || quote_id.slice(0, 8)}`,
            },
            unit_amount: Math.round(paymentAmount * 100), // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/payment/cancel?invoice_id=${invoiceId}`,
      metadata: {
        quote_id: quote_id,
        invoice_id: invoiceId,
        user_id: user.id,
        payment_type: payment_type,
        client_email: invoice.client_email || quote.client_email || client_email || '',
        client_name: invoice.client_name || quote.client_name || client_name || '',
      },
      customer_email: invoice.client_email || quote.client_email || client_email,
    };

    // Si Stripe Connect est configuré, ajouter le connected account
    if (stripeAccountId && userSettings?.stripe_connected) {
      console.log('✅ Utilisation Stripe Connect:', stripeAccountId);
      // @ts-ignore - Stripe types
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(paymentAmount * 100 * 0.02), // 2% de frais applicatifs
      };
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    );

    console.log('✅ Stripe Checkout Session créée:', session.id);

    // =====================================================
    // 5️⃣ ENREGISTRER LE PAIEMENT EN BASE
    // =====================================================

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        company_id: quote.company_id,
        invoice_id: invoiceId,
        quote_id: quote_id,
        client_id: quote.client_id,
        amount: paymentAmount,
        payment_type: payment_type,
        payment_method: 'stripe',
        payment_link: session.url,
        stripe_session_id: session.id,
        currency: 'EUR',
        status: 'pending',
        reference: invoice.invoice_number,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erreur création paiement:', paymentError);
      // Ne pas bloquer, le webhook gérera
    } else {
      console.log('✅ Paiement créé en base:', payment.id);
    }

    // Mettre à jour la facture
    await supabaseClient
      .from('invoices')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    // =====================================================
    // 6️⃣ RETOURNER LE LIEN
    // =====================================================

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: session.url,  // ← Changé de payment_link à payment_url
        payment_link: session.url,  // ← Gardé pour rétrocompatibilité
        session_id: session.id,
        payment_id: payment?.id,
        invoice_id: invoiceId,
        amount: paymentAmount,
        currency: 'EUR',
        payment_type: payment_type,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error in create-payment-link:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', details: error.stack }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});



