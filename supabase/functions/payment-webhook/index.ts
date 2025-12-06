/**
 * Payment Webhook Edge Function
 * 
 * Route les webhooks de tous les payment providers vers le bon adapter
 * Supporte: Stripe, SumUp, PayPlug, Stancer, GoCardless
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { paymentService } from '../../src/services/PaymentService.ts';
import type { PaymentProviderType } from '../../src/payment_providers/types/PaymentTypes.ts';

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
    // Déterminer le provider depuis les headers ou le path
    const provider = determineProvider(req);
    if (!provider) {
      throw new Error('Unable to determine payment provider from request');
    }

    // Récupérer le secret webhook pour ce provider
    const webhookSecret = getWebhookSecret(provider);
    if (!webhookSecret) {
      throw new Error(`Webhook secret not configured for ${provider}`);
    }

    // Vérifier et parser le webhook
    const event = await paymentService.verifyWebhook(req, provider, webhookSecret);

    // Traiter l'événement selon son type
    await processWebhookEvent(event, provider);

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Déterminer le provider depuis la requête
 */
function determineProvider(req: Request): PaymentProviderType | null {
  // Vérifier les headers spécifiques à chaque provider
  if (req.headers.get('stripe-signature')) {
    return 'stripe';
  }
  if (req.headers.get('x-sumup-signature')) {
    return 'sumup';
  }
  if (req.headers.get('payplug-signature')) {
    return 'payplug';
  }
  if (req.headers.get('stancer-signature')) {
    return 'stancer';
  }
  if (req.headers.get('webhook-signature')) {
    // GoCardless utilise webhook-signature
    return 'gocardless';
  }

  // Vérifier l'URL path
  const url = new URL(req.url);
  const path = url.pathname;
  
  if (path.includes('stripe')) return 'stripe';
  if (path.includes('sumup')) return 'sumup';
  if (path.includes('payplug')) return 'payplug';
  if (path.includes('stancer')) return 'stancer';
  if (path.includes('gocardless')) return 'gocardless';

  return null;
}

/**
 * Récupérer le secret webhook pour un provider
 */
function getWebhookSecret(provider: PaymentProviderType): string | null {
  const envVarMap: Record<PaymentProviderType, string> = {
    stripe: 'STRIPE_WEBHOOK_SECRET',
    sumup: 'SUMUP_WEBHOOK_SECRET',
    payplug: 'PAYPLUG_WEBHOOK_SECRET',
    stancer: 'STANCER_WEBHOOK_SECRET',
    gocardless: 'GOCARDLESS_WEBHOOK_SECRET',
  };

  return Deno.env.get(envVarMap[provider]) || null;
}

/**
 * Traiter un événement webhook
 */
async function processWebhookEvent(
  event: any,
  provider: PaymentProviderType
): Promise<void> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Extraire les informations du paiement depuis l'événement
  const paymentId = extractPaymentId(event, provider);
  const status = extractStatus(event, provider);
  const amount = extractAmount(event, provider);

  if (!paymentId) {
    console.warn('No payment ID found in webhook event');
    return;
  }

  // Mettre à jour le paiement dans la base de données
  const { error } = await supabaseClient
    .from('payments')
    .update({
      status: mapWebhookStatusToPaymentStatus(status),
      paid_date: status === 'succeeded' || status === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_payment_id', paymentId)
    .eq('provider_type', provider);

  if (error) {
    console.error('Error updating payment:', error);
    throw error;
  }

  // Mettre à jour la facture/devis associé si le paiement est réussi
  if (status === 'succeeded' || status === 'paid') {
    const { data: payment } = await supabaseClient
      .from('payments')
      .select('invoice_id, quote_id')
      .eq('provider_payment_id', paymentId)
      .single();

    if (payment?.invoice_id) {
      await supabaseClient
        .from('invoices')
        .update({ status: 'paid', payment_status: 'paid' })
        .eq('id', payment.invoice_id);
    }

    if (payment?.quote_id) {
      // Marquer le devis comme payé (si applicable)
      // La logique dépend de votre modèle de données
    }
  }
}

/**
 * Extraire l'ID du paiement depuis l'événement webhook
 */
function extractPaymentId(event: any, provider: PaymentProviderType): string | null {
  switch (provider) {
    case 'stripe':
      return event.data?.id || event.data?.payment_intent || null;
    case 'sumup':
      return event.data?.id || event.data?.transaction_code || null;
    case 'payplug':
      return event.data?.id || event.data?.payment_id || null;
    case 'stancer':
      return event.data?.id || event.data?.payment_id || null;
    case 'gocardless':
      return event.data?.id || event.data?.payment_id || null;
    default:
      return null;
  }
}

/**
 * Extraire le statut depuis l'événement webhook
 */
function extractStatus(event: any, provider: PaymentProviderType): string {
  switch (provider) {
    case 'stripe':
      return event.data?.status || event.type || 'unknown';
    case 'sumup':
      return event.data?.status || 'unknown';
    case 'payplug':
      return event.data?.is_paid ? 'paid' : event.data?.status || 'unknown';
    case 'stancer':
      return event.data?.status || 'unknown';
    case 'gocardless':
      return event.data?.status || 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * Extraire le montant depuis l'événement webhook
 */
function extractAmount(event: any, provider: PaymentProviderType): number | null {
  switch (provider) {
    case 'stripe':
      return event.data?.amount ? event.data.amount / 100 : null;
    case 'sumup':
      return event.data?.amount ? event.data.amount / 100 : null;
    case 'payplug':
      return event.data?.amount ? event.data.amount / 100 : null;
    case 'stancer':
      return event.data?.amount ? event.data.amount / 100 : null;
    case 'gocardless':
      return event.data?.amount ? event.data.amount / 100 : null;
    default:
      return null;
  }
}

/**
 * Mapper le statut du webhook vers le statut de paiement
 */
function mapWebhookStatusToPaymentStatus(webhookStatus: string): string {
  const statusMap: Record<string, string> = {
    succeeded: 'paid',
    paid: 'paid',
    success: 'paid',
    successful: 'paid',
    pending: 'pending',
    processing: 'pending',
    failed: 'failed',
    cancelled: 'cancelled',
    refunded: 'paid', // Géré séparément
  };

  return statusMap[webhookStatus.toLowerCase()] || 'pending';
}







