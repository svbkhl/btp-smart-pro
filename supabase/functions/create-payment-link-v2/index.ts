/**
 * Edge Function: create-payment-link (V2)
 * 
 * Crée un lien de paiement Stripe Checkout Session
 * 
 * NOUVEA: Support paiement en plusieurs fois (installments)
 * 
 * Types de paiement:
 * - total: Paiement complet en une fois
 * - deposit: Acompte (montant personnalisé)
 * - installments: Paiement en plusieurs fois (2x, 3x, 4x...)
 * 
 * Flow installments:
 * 1. Génère un plan de paiement (payment_schedules)
 * 2. Crée le lien Stripe pour la 1ère échéance uniquement
 * 3. Les échéances suivantes sont envoyées après paiement de la précédente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
    const APP_URL = Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_URL') || 'https://www.btpsmartpro.com';

    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      quote_id, 
      invoice_id,
      payment_type = 'total', // 'total', 'deposit', 'installments'
      amount, // Montant custom (acompte)
      installments_count, // Nombre d'échéances (2, 3, 4...)
      schedule_id, // ID échéance existante (si envoi lien échéance suivante)
      client_email,
      client_name
    } = body;

    console.log('📥 [create-payment-link-v2] Requête:', { 
      quote_id, 
      invoice_id, 
      payment_type, 
      amount, 
      installments_count, 
      schedule_id,
      user_id: user.id 
    });

    // =====================================================
    // 1️⃣ VÉRIFIER LE DEVIS
    // =====================================================

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: quote, error: quoteError } = await supabaseClient
      .from('ai_quotes')
      .select('*')
      .eq('id', quote_id)
      .eq('user_id', user.id)
      .single();

    if (quoteError || !quote) {
      console.error('❌ Devis non trouvé:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!quote.signed || !quote.signed_at) {
      console.error('❌ Devis non signé');
      return new Response(
        JSON.stringify({ error: 'Quote must be signed before payment', quote_status: quote.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Devis trouvé et signé:', quote_id);

    // =====================================================
    // 2️⃣ GÉNÉRER OU RÉCUPÉRER LA FACTURE
    // =====================================================

    let invoice;
    let invoiceId = invoice_id;

    if (!invoiceId) {
      const { data: existingInvoice } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('quote_id', quote_id)
        .eq('user_id', user.id)
        .single();

      if (existingInvoice) {
        invoice = existingInvoice;
        invoiceId = existingInvoice.id;
        console.log('✅ Facture existante trouvée:', invoiceId);
      } else {
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
            payment_plan_type: payment_type === 'installments' ? 'installments' : payment_type === 'deposit' ? 'deposit' : 'single',
            installments_count: payment_type === 'installments' ? installments_count : null,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          })
          .select()
          .single();

        if (invoiceError || !newInvoice) {
          console.error('❌ Erreur création facture:', invoiceError);
          return new Response(
            JSON.stringify({ error: 'Failed to create invoice', details: invoiceError?.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        invoice = newInvoice;
        invoiceId = newInvoice.id;
        console.log('✅ Nouvelle facture créée:', invoiceId);
      }
    } else {
      const { data: existingInvoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single();

      if (invoiceError || !existingInvoice) {
        console.error('❌ Facture non trouvée:', invoiceError);
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invoice = existingInvoice;
    }

    if (invoice.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Invoice already paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // 3️⃣ GÉRER LE TYPE DE PAIEMENT
    // =====================================================

    let paymentAmount = 0;
    let scheduleItem = null;
    const invoiceTotal = invoice.amount || invoice.total_ttc || 0;
    const alreadyPaid = invoice.amount_paid || 0;
    const remaining = invoiceTotal - alreadyPaid;

    // ==========================================
    // 3.1 - PAIEMENT EN PLUSIEURS FOIS
    // ==========================================
    if (payment_type === 'installments') {
      if (!installments_count || installments_count < 2) {
        return new Response(
          JSON.stringify({ error: 'installments_count must be at least 2' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si schedule_id fourni, on paye une échéance existante
      if (schedule_id) {
        console.log('💰 Paiement d\'une échéance existante:', schedule_id);
        
        const { data: schedule, error: scheduleError } = await supabaseClient
          .from('payment_schedules')
          .select('*')
          .eq('id', schedule_id)
          .eq('invoice_id', invoiceId)
          .single();

        if (scheduleError || !schedule) {
          return new Response(
            JSON.stringify({ error: 'Schedule not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (schedule.status === 'paid') {
          return new Response(
            JSON.stringify({ error: 'This installment is already paid' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Vérifier que l'échéance précédente est payée
        const { data: isPrevPaidResult } = await supabaseClient
          .rpc('is_previous_installment_paid', {
            p_invoice_id: invoiceId,
            p_installment_number: schedule.installment_number
          });

        if (!isPrevPaidResult) {
          return new Response(
            JSON.stringify({ 
              error: 'Previous installment must be paid first',
              installment_number: schedule.installment_number
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        scheduleItem = schedule;
        paymentAmount = schedule.amount;
      } 
      // Sinon, générer le plan de paiement
      else {
        console.log(`💰 Génération plan de paiement en ${installments_count}x`);
        
        // Vérifier qu'aucun plan n'existe déjà
        const { data: existingSchedules } = await supabaseClient
          .from('payment_schedules')
          .select('id')
          .eq('invoice_id', invoiceId)
          .limit(1);

        if (existingSchedules && existingSchedules.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Payment schedule already exists for this invoice' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Générer le plan de paiement
        const { data: schedules, error: schedError } = await supabaseClient
          .rpc('generate_payment_schedule', {
            p_invoice_id: invoiceId,
            p_user_id: user.id,
            p_company_id: quote.company_id,
            p_quote_id: quote_id,
            p_total_amount: remaining,
            p_installments_count: installments_count,
            p_first_due_date: new Date().toISOString().split('T')[0]
          });

        if (schedError) {
          console.error('❌ Erreur génération plan:', schedError);
          return new Response(
            JSON.stringify({ error: 'Failed to generate payment schedule', details: schedError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Plan de paiement généré:', schedules?.length, 'échéances');

        // Récupérer la première échéance
        const { data: firstSchedule } = await supabaseClient
          .from('payment_schedules')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('installment_number', 1)
          .single();

        if (!firstSchedule) {
          return new Response(
            JSON.stringify({ error: 'Failed to get first installment' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        scheduleItem = firstSchedule;
        paymentAmount = firstSchedule.amount;
      }
    }
    // ==========================================
    // 3.2 - PAIEMENT TOTAL
    // ==========================================
    else if (payment_type === 'total') {
      paymentAmount = remaining;
    }
    // ==========================================
    // 3.3 - ACOMPTE
    // ==========================================
    else if (payment_type === 'deposit' || payment_type === 'partial') {
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Amount is required for deposit/partial payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      paymentAmount = Math.min(amount, remaining);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment_type. Use: total, deposit, or installments' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Payment amount must be greater than 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 Montant à payer:', { 
      paymentAmount, 
      payment_type, 
      installment_number: scheduleItem?.installment_number 
    });

    // =====================================================
    // 4️⃣ CRÉER LA STRIPE CHECKOUT SESSION
    // =====================================================

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { data: userSettings } = await supabaseClient
      .from('user_settings')
      .select('stripe_account_id, stripe_connected')
      .eq('user_id', user.id)
      .single();

    const stripeAccountId = userSettings?.stripe_account_id;

    // Description selon le type
    let description = `Facture ${invoice.invoice_number}`;
    if (scheduleItem) {
      description += ` - Échéance ${scheduleItem.installment_number}/${scheduleItem.total_installments}`;
    } else if (payment_type === 'deposit') {
      description += ` - Acompte`;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Facture ${invoice.invoice_number}`,
              description: description,
            },
            unit_amount: Math.round(paymentAmount * 100),
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
        schedule_id: scheduleItem?.id || '',
        installment_number: scheduleItem?.installment_number || '',
        client_email: invoice.client_email || quote.client_email || client_email || '',
        client_name: invoice.client_name || quote.client_name || client_name || '',
      },
      customer_email: invoice.client_email || quote.client_email || client_email,
    };

    if (stripeAccountId && userSettings?.stripe_connected) {
      console.log('✅ Utilisation Stripe Connect:', stripeAccountId);
      // @ts-ignore
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(paymentAmount * 100 * 0.02),
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
        schedule_id: scheduleItem?.id || null,
        installment_number: scheduleItem?.installment_number || null,
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
    } else {
      console.log('✅ Paiement créé en base:', payment.id);
    }

    // Mettre à jour l'échéance si applicable
    if (scheduleItem) {
      await supabaseClient
        .from('payment_schedules')
        .update({
          stripe_session_id: session.id,
          payment_link: session.url,
          status: 'processing',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleItem.id);
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
        schedule_id: scheduleItem?.id,
        installment_number: scheduleItem?.installment_number,
        total_installments: scheduleItem?.total_installments,
        amount: paymentAmount,
        currency: 'EUR',
        payment_type: payment_type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error in create-payment-link-v2:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', details: error.stack }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});



