/**
 * Edge Function: stripe-invoice-webhook
 * 
 * Webhook Stripe spécifique pour les paiements de factures
 * 
 * Événements gérés:
 * - checkout.session.completed
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Create Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the request body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verify webhook signature
    let event: Stripe.Event;
    if (STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
        console.log('✅ Webhook signature verified');
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return new Response(
          JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // Si pas de secret configuré, parser quand même (DEV ONLY)
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured - skipping signature verification (DEV ONLY)');
      event = JSON.parse(body);
    }

    console.log('📥 Webhook reçu:', { type: event.type, id: event.id });

    // =====================================================
    // GÉRER LES ÉVÉNEMENTS SELON LE TYPE
    // =====================================================

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event, supabaseClient);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event, supabaseClient);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event, supabaseClient);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error in stripe-invoice-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// =====================================================
// HANDLER: checkout.session.completed
// =====================================================
async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  supabaseClient: any
) {
  const session = event.data.object as Stripe.Checkout.Session;
  console.log('💰 [checkout.session.completed]', {
    session_id: session.id,
    amount: session.amount_total,
    payment_status: session.payment_status,
  });

  // Récupérer le paiement en base via session_id
  const { data: payment, error: paymentError } = await supabaseClient
    .from('payments')
    .select('*')
    .eq('stripe_session_id', session.id)
    .single();

  if (paymentError || !payment) {
    console.error('❌ Paiement non trouvé pour session:', session.id);
    return;
  }

  console.log('✅ Paiement trouvé:', payment.id);

  // Vérifier que le paiement n'a pas déjà été traité
  if (payment.status === 'completed') {
    console.log('ℹ️ Paiement déjà traité');
    return;
  }

  // Vérifier le montant
  const expectedAmount = Math.round(payment.amount * 100); // Convertir en centimes
  const receivedAmount = session.amount_total || 0;

  if (receivedAmount !== expectedAmount) {
    console.error('❌ Montant incorrect:', { expected: expectedAmount, received: receivedAmount });
    // Continuer quand même mais logger l'anomalie
  }

  // Mettre à jour le paiement
  const { error: updatePaymentError } = await supabaseClient
    .from('payments')
    .update({
      status: 'completed',
      paid_date: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent,
      webhook_received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  if (updatePaymentError) {
    console.error('❌ Erreur mise à jour paiement:', updatePaymentError);
    return;
  }

  console.log('✅ Paiement mis à jour:', payment.id);

  // =====================================================
  // GÉRER LES ÉCHÉANCES (PAIEMENT EN PLUSIEURS FOIS)
  // =====================================================
  
  if (payment.schedule_id) {
    console.log('📅 Paiement lié à une échéance:', payment.schedule_id);
    
    // Mettre à jour l'échéance
    const { error: updateScheduleError } = await supabaseClient
      .from('payment_schedules')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.schedule_id);

    if (updateScheduleError) {
      console.error('❌ Erreur mise à jour échéance:', updateScheduleError);
    } else {
      console.log('✅ Échéance marquée comme payée');
      
      // Récupérer l'échéance pour savoir le numéro
      const { data: schedule } = await supabaseClient
        .from('payment_schedules')
        .select('*')
        .eq('id', payment.schedule_id)
        .single();

      if (schedule) {
        // Vérifier s'il y a une échéance suivante
        const nextInstallmentNumber = schedule.installment_number + 1;
        
        if (nextInstallmentNumber <= schedule.total_installments) {
          console.log(`📧 Envoi du lien pour l'échéance ${nextInstallmentNumber}/${schedule.total_installments}`);
          
          // Récupérer l'échéance suivante
          const { data: nextSchedule } = await supabaseClient
            .from('payment_schedules')
            .select('*')
            .eq('invoice_id', payment.invoice_id)
            .eq('installment_number', nextInstallmentNumber)
            .single();

          if (nextSchedule) {
            // TODO: Créer automatiquement le lien de paiement pour l'échéance suivante
            // et l'envoyer par email au client
            console.log('💡 Échéance suivante trouvée:', nextSchedule.id);
            console.log('📧 TODO: Envoyer email avec lien de paiement échéance', nextInstallmentNumber);
            
            // Pour l'instant, on log juste. L'email sera implémenté séparément.
            // L'admin pourra aussi manuellement envoyer le lien depuis l'interface.
          }
        } else {
          console.log('🎉 Toutes les échéances sont payées !');
        }
      }
    }
  }

  // Mettre à jour la facture
  if (payment.invoice_id) {
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', payment.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('❌ Facture non trouvée:', payment.invoice_id);
      return;
    }

    const newAmountPaid = (invoice.amount_paid || 0) + payment.amount;
    const newAmountRemaining = (invoice.amount || invoice.total_ttc || 0) - newAmountPaid;
    const newStatus = newAmountRemaining <= 0 ? 'paid' : 'partially_paid';

    const { error: updateInvoiceError } = await supabaseClient
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        amount_remaining: newAmountRemaining,
        status: newStatus,
        paid_date: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.invoice_id);

    if (updateInvoiceError) {
      console.error('❌ Erreur mise à jour facture:', updateInvoiceError);
      return;
    }

    console.log('✅ Facture mise à jour:', payment.invoice_id, {
      amount_paid: newAmountPaid,
      amount_remaining: newAmountRemaining,
      status: newStatus,
    });

    // Mettre à jour le devis si payé intégralement
    if (payment.quote_id && newStatus === 'paid') {
      await supabaseClient
        .from('ai_quotes')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.quote_id);

      console.log('✅ Devis marqué comme payé:', payment.quote_id);
    }
  }

  console.log('🎉 Paiement complété avec succès');
}

// =====================================================
// HANDLER: payment_intent.succeeded
// =====================================================
async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  supabaseClient: any
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  console.log('✅ [payment_intent.succeeded]', {
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
  });

  // Récupérer le paiement en base via payment_intent_id
  const { data: payment, error: paymentError } = await supabaseClient
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (paymentError || !payment) {
    console.log('ℹ️ Paiement non trouvé pour payment_intent (normal si déjà traité via checkout.session.completed)');
    return;
  }

  // Si pas encore traité, le traiter
  if (payment.status !== 'completed') {
    await supabaseClient
      .from('payments')
      .update({
        status: 'completed',
        paid_date: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    console.log('✅ Paiement mis à jour via payment_intent.succeeded');
  }
}

// =====================================================
// HANDLER: payment_intent.payment_failed
// =====================================================
async function handlePaymentIntentFailed(
  event: Stripe.Event,
  supabaseClient: any
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  console.log('❌ [payment_intent.payment_failed]', {
    payment_intent_id: paymentIntent.id,
    last_payment_error: paymentIntent.last_payment_error,
  });

  // Récupérer le paiement en base
  const { data: payment, error: paymentError } = await supabaseClient
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (paymentError || !payment) {
    console.log('ℹ️ Paiement non trouvé');
    return;
  }

  // Mettre à jour le statut en échec
  await supabaseClient
    .from('payments')
    .update({
      status: 'failed',
      notes: paymentIntent.last_payment_error?.message || 'Payment failed',
      webhook_received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  console.log('✅ Paiement marqué en échec');
}



